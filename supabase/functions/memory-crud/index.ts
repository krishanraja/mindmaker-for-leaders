/**
 * Memory CRUD Edge Function
 * 
 * Handles all memory operations with server-side encryption/decryption.
 * Routes:
 * - POST /create - Create new memory
 * - GET /list - List memories with filters
 * - GET /item/:id - Get single memory item
 * - PUT /update/:id - Update memory
 * - DELETE /delete/:id - Delete single memory
 * - POST /bulk-delete - Bulk delete by filter
 * - GET /export - Export all memory as JSON/CSV
 * - POST /import - Import memory from JSON
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { encrypt } from "../_shared/memory-crypto.ts";
import { runGuardrails, type IncomingFact } from "../_shared/fact-guardrails.ts";

const CreateMemorySchema = z.object({
  fact_key: z.string().min(1, "fact_key is required"),
  fact_category: z.string().min(1, "fact_category is required"),
  fact_label: z.string().min(1, "fact_label is required"),
  fact_value: z.string().min(1, "fact_value is required"),
  fact_context: z.string().optional(),
  source_type: z.string().default("manual"),
  confidence_score: z.number().min(0).max(1).default(1.0),
  is_high_stakes: z.boolean().default(false),
});

const UpdateMemorySchema = z.object({
  fact_value: z.string().optional(),
  fact_context: z.string().optional(),
  fact_label: z.string().optional(),
  verification_status: z.enum(["verified", "inferred", "corrected", "disputed"]).optional(),
});

const BulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  delete_all: z.boolean().optional(),
});

const ImportMemoryItemSchema = z.object({
  fact_key: z.string().min(1),
  fact_category: z.string().min(1),
  fact_label: z.string().min(1),
  fact_value: z.string().min(1),
  fact_context: z.string().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  is_high_stakes: z.boolean().optional(),
  verification_status: z.string().optional(),
});

const ImportSchema = z.object({
  memories: z.array(ImportMemoryItemSchema),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AES-256-GCM encrypt() is shared from ../_shared/memory-crypto.ts so memory-crud
// and extract-user-context use a single implementation keyed off MEMORY_ENCRYPTION_KEY.

interface MemoryItem {
  id: string;
  fact_key: string;
  fact_category: string;
  fact_label: string;
  fact_value: string;
  fact_context?: string;
  confidence_score: number;
  is_high_stakes: boolean;
  verification_status: string;
  source_type: string;
  created_at: string;
  updated_at: string;
  encrypted_content?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Route relative to the function name so it works whether the runtime passes
    // /memory-crud/create or /functions/v1/memory-crud/create (the pre-existing
    // pathParts[0] assumed the action was the first segment, which it never is).
    const fnIdx = pathParts.indexOf('memory-crud');
    const action = (fnIdx >= 0 ? pathParts[fnIdx + 1] : pathParts[0]) || '';
    const itemId = fnIdx >= 0 ? pathParts[fnIdx + 2] : pathParts[1];

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Auth client to get user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization') ?? '' },
      },
      auth: { persistSession: false },
    });

    const { data: userData, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Rate limiting: 60 requests per minute (CRUD operations)
    const rateLimitResult = checkRateLimit(userId, { maxRequests: 60, windowMs: 60_000 });
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    // Service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Route handling
    switch (action) {
      case 'create': {
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();
        const parsed = CreateMemorySchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { fact_key, fact_category, fact_label, fact_value, fact_context, source_type, confidence_score, is_high_stakes } = parsed.data;

        // Check user's privacy settings
        const { data: settings } = await supabase
          .from('user_memory_settings')
          .select('store_memory_enabled')
          .eq('user_id', userId)
          .single();

        if (settings && !settings.store_memory_enabled) {
          return new Response(
            JSON.stringify({ error: 'Memory storage is disabled in your privacy settings' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Off the record is the per-session sibling of the persistent
        // store_memory_enabled switch above. Same refusal, different scope:
        // this one lasts for one conversation and is not stored anywhere.
        if (body?.off_the_record === true) {
          return new Response(
            JSON.stringify({
              error: 'off_the_record',
              message: 'This session is off the record, so nothing was saved.',
              saved_nothing: true,
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Hygiene guardrails: reject style-rules / negations / transient / third-party
        // identity even for user-asserted (1.0 confidence) facts. The MIN_CONFIDENCE
        // gate does not fire at 1.0; the pattern-based rejects still do.
        const incoming: IncomingFact = {
          fact_key,
          fact_category,
          fact_label,
          fact_value,
          fact_context: fact_context ?? '', // IncomingFact requires a non-null context
          confidence_score,
          is_high_stakes,
        };
        const { kept, training_version } = await runGuardrails([incoming], userId, null, supabase);
        if (kept.length === 0) {
          return new Response(
            JSON.stringify({
              error: 'rejected_by_guardrails',
              message: 'This looks like a style rule, a negation, or transient state, not a durable fact.',
            }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const guarded = kept[0]; // carries fact_subtype

        // Encrypt sensitive content (AES-256-GCM, shared crypto module)
        const contentToEncrypt = JSON.stringify({ fact_value, fact_context: fact_context || '' });
        const { ciphertext, iv } = await encrypt(contentToEncrypt);

        const { data: newMemory, error: insertError } = await supabase
          .from('user_memory')
          .insert({
            user_id: userId,
            fact_key,
            fact_category,
            fact_label,
            fact_value, // Keep plaintext for display/search (plaintext-shadow follow-up to remove)
            fact_context,
            encrypted_content: JSON.stringify({ ciphertext, iv }),
            encryption_version: 1,
            confidence_score,
            is_high_stakes,
            // A3: both manual and voice are user-asserted (the two AddMemorySheet
            // sources), so neither is silently demoted to 'inferred' when routed
            // through memory-crud. Only the AI extractor owns 'inferred'.
            verification_status: (source_type === 'manual' || source_type === 'voice') ? 'verified' : 'inferred',
            source_type,
            fact_subtype: guarded.fact_subtype ?? null,
            training_material_version: training_version,
            is_current: true,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to create memory' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Don't log sensitive content
        console.log(`Memory created: ${newMemory.id} for user ${userId}`);

        return new Response(
          JSON.stringify({ success: true, memory: newMemory }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        if (req.method !== 'GET') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const category = url.searchParams.get('category');
        const source = url.searchParams.get('source');
        const search = url.searchParams.get('search');
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        let query = supabase
          .from('user_memory')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .eq('is_current', true)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (category) {
          query = query.eq('fact_category', category);
        }
        if (source) {
          query = query.eq('source_type', source);
        }
        if (search) {
          query = query.or(`fact_value.ilike.%${search}%,fact_label.ilike.%${search}%`);
        }
        if (startDate) {
          query = query.gte('created_at', startDate);
        }
        if (endDate) {
          query = query.lte('created_at', endDate);
        }

        const { data: memories, error: listError, count } = await query;

        if (listError) {
          console.error('List error:', listError);
          return new Response(
            JSON.stringify({ error: 'Failed to list memories' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            memories: memories || [], 
            total: count || 0,
            limit,
            offset 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'item': {
        if (req.method !== 'GET' || !itemId) {
          return new Response(
            JSON.stringify({ error: 'Method not allowed or missing item ID' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: memory, error: getError } = await supabase
          .from('user_memory')
          .select('*')
          .eq('id', itemId)
          .eq('user_id', userId)
          .single();

        if (getError || !memory) {
          return new Response(
            JSON.stringify({ error: 'Memory not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, memory }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (req.method !== 'PUT' || !itemId) {
          return new Response(
            JSON.stringify({ error: 'Method not allowed or missing item ID' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();
        const parsed = UpdateMemorySchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { fact_value, fact_context, fact_label, verification_status } = parsed.data;

        // Verify ownership
        const { data: existing } = await supabase
          .from('user_memory')
          .select('id')
          .eq('id', itemId)
          .eq('user_id', userId)
          .single();

        if (!existing) {
          return new Response(
            JSON.stringify({ error: 'Memory not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updates: Record<string, any> = {};
        
        if (fact_value !== undefined) {
          updates.fact_value = fact_value;
          // Re-encrypt if content changed
          const contentToEncrypt = JSON.stringify({ fact_value, fact_context: fact_context || '' });
          const { ciphertext, iv } = await encrypt(contentToEncrypt);
          updates.encrypted_content = JSON.stringify({ ciphertext, iv });
        }
        if (fact_context !== undefined) updates.fact_context = fact_context;
        if (fact_label !== undefined) updates.fact_label = fact_label;
        if (verification_status !== undefined) {
          updates.verification_status = verification_status;
          if (verification_status === 'verified' || verification_status === 'corrected') {
            updates.verified_at = new Date().toISOString();
          }
        }

        const { data: updated, error: updateError } = await supabase
          .from('user_memory')
          .update(updates)
          .eq('id', itemId)
          .select()
          .single();

        if (updateError) {
          console.error('Update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update memory' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, memory: updated }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (req.method !== 'DELETE' || !itemId) {
          return new Response(
            JSON.stringify({ error: 'Method not allowed or missing item ID' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Soft delete by setting is_current = false
        const { error: deleteError } = await supabase
          .from('user_memory')
          .update({ is_current: false })
          .eq('id', itemId)
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Delete error:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to delete memory' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'bulk-delete': {
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();
        const parsed = BulkDeleteSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { ids, category, source, start_date, end_date, delete_all } = parsed.data;

        let query = supabase
          .from('user_memory')
          .update({ is_current: false })
          .eq('user_id', userId)
          .eq('is_current', true);

        if (ids && Array.isArray(ids) && ids.length > 0) {
          query = query.in('id', ids);
        } else if (delete_all) {
          // Delete all - no additional filter
        } else {
          if (category) query = query.eq('fact_category', category);
          if (source) query = query.eq('source_type', source);
          if (start_date) query = query.gte('created_at', start_date);
          if (end_date) query = query.lte('created_at', end_date);
        }

        const { error: bulkDeleteError, count } = await query;

        if (bulkDeleteError) {
          console.error('Bulk delete error:', bulkDeleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to delete memories' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, deleted_count: count || 0 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'export': {
        if (req.method !== 'GET') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const format = url.searchParams.get('format') || 'json';

        const { data: memories, error: exportError } = await supabase
          .from('user_memory')
          .select('id, fact_key, fact_category, fact_label, fact_value, fact_context, confidence_score, verification_status, source_type, created_at, updated_at')
          .eq('user_id', userId)
          .eq('is_current', true)
          .order('created_at', { ascending: false });

        if (exportError) {
          console.error('Export error:', exportError);
          return new Response(
            JSON.stringify({ error: 'Failed to export memories' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (format === 'csv') {
          const headers = ['id', 'fact_key', 'fact_category', 'fact_label', 'fact_value', 'fact_context', 'confidence_score', 'verification_status', 'source_type', 'created_at', 'updated_at'];
          const csvRows = [headers.join(',')];
          
          for (const memory of memories || []) {
            const row = headers.map(h => {
              const val = (memory as any)[h];
              if (val === null || val === undefined) return '';
              const str = String(val);
              // Escape quotes and wrap in quotes if contains comma or quote
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            });
            csvRows.push(row.join(','));
          }

          return new Response(csvRows.join('\n'), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="memory-export-${new Date().toISOString().split('T')[0]}.csv"`,
            },
          });
        }

        // JSON format
        const exportData = {
          exported_at: new Date().toISOString(),
          version: '1.0',
          count: memories?.length || 0,
          memories: memories || [],
        };

        return new Response(JSON.stringify(exportData, null, 2), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="memory-export-${new Date().toISOString().split('T')[0]}.json"`,
          },
        });
      }

      case 'import': {
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();
        const parsed = ImportSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { memories } = parsed.data;

        let imported = 0;
        let skipped = 0;

        for (const memory of memories) {
          if (!memory.fact_key || !memory.fact_category || !memory.fact_label || !memory.fact_value) {
            skipped++;
            continue;
          }

          // Check for duplicates
          const { data: existing } = await supabase
            .from('user_memory')
            .select('id')
            .eq('user_id', userId)
            .eq('fact_key', memory.fact_key)
            .eq('is_current', true)
            .single();

          if (existing) {
            skipped++;
            continue;
          }

          // Encrypt and insert
          const contentToEncrypt = JSON.stringify({ 
            fact_value: memory.fact_value, 
            fact_context: memory.fact_context || '' 
          });
          const { ciphertext, iv } = await encrypt(contentToEncrypt);

          const { error: insertError } = await supabase
            .from('user_memory')
            .insert({
              user_id: userId,
              fact_key: memory.fact_key,
              fact_category: memory.fact_category,
              fact_label: memory.fact_label,
              fact_value: memory.fact_value,
              fact_context: memory.fact_context,
              encrypted_content: JSON.stringify({ ciphertext, iv }),
              encryption_version: 1,
              confidence_score: memory.confidence_score || 1.0,
              is_high_stakes: memory.is_high_stakes || false,
              verification_status: memory.verification_status || 'verified',
              source_type: 'manual',
              is_current: true,
            });

          if (!insertError) {
            imported++;
          } else {
            skipped++;
          }
        }

        return new Response(
          JSON.stringify({ success: true, imported, skipped }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
