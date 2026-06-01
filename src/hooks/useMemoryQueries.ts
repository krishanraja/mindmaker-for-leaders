/**
 * useMemoryQueries Hook
 * 
 * React Query hooks for memory CRUD operations with optimistic updates.
 * Uses the memory-crud and memory-settings edge functions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserMemoryFact, FactCategory } from '@/types/memory';
import type { MemorySettings, MemorySettingsUpdate } from '@/types/memory-settings';

// Query keys
export const memoryKeys = {
  all: ['memory'] as const,
  lists: () => [...memoryKeys.all, 'list'] as const,
  list: (filters: MemoryFilters) => [...memoryKeys.lists(), filters] as const,
  details: () => [...memoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...memoryKeys.details(), id] as const,
  settings: () => [...memoryKeys.all, 'settings'] as const,
};

// Types
export interface MemoryFilters {
  category?: FactCategory;
  source?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface MemoryListResponse {
  success: boolean;
  memories: UserMemoryFact[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateMemoryInput {
  fact_key: string;
  fact_category: FactCategory;
  fact_label: string;
  fact_value: string;
  fact_context?: string;
  source_type?: string;
  confidence_score?: number;
  is_high_stakes?: boolean;
}

export interface UpdateMemoryInput {
  fact_value?: string;
  fact_context?: string;
  fact_label?: string;
  verification_status?: string;
}

export interface BulkDeleteInput {
  ids?: string[];
  category?: FactCategory;
  source?: string;
  start_date?: string;
  end_date?: string;
  delete_all?: boolean;
}

// API functions
async function fetchMemoryList(filters: MemoryFilters): Promise<MemoryListResponse> {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.source) params.set('source', filters.source);
  if (filters.search) params.set('search', filters.search);
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.offset) params.set('offset', filters.offset.toString());

  const { data, error } = await supabase.functions.invoke('memory-crud', {
    body: null,
    headers: { 'Content-Type': 'application/json' },
    method: 'GET',
  });

  // Since Supabase functions.invoke doesn't support query params well,
  // we'll use the list action with body
  const response = await supabase.functions.invoke('memory-crud/list', {
    method: 'GET',
  });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to fetch memories');
  }

  return response.data as MemoryListResponse;
}

async function fetchMemoryItem(id: string): Promise<UserMemoryFact> {
  const { data, error } = await supabase.functions.invoke(`memory-crud/item/${id}`, {
    method: 'GET',
  });

  if (error) {
    throw new Error(error.message || 'Failed to fetch memory item');
  }

  return data.memory as UserMemoryFact;
}

async function createMemory(input: CreateMemoryInput): Promise<UserMemoryFact> {
  const { data, error } = await supabase.functions.invoke('memory-crud/create', {
    body: input,
  });

  if (error) {
    throw new Error(error.message || 'Failed to create memory');
  }

  return data.memory as UserMemoryFact;
}

async function updateMemory(id: string, input: UpdateMemoryInput): Promise<UserMemoryFact> {
  const { data, error } = await supabase.functions.invoke(`memory-crud/update/${id}`, {
    body: input,
    method: 'PUT',
  });

  if (error) {
    throw new Error(error.message || 'Failed to update memory');
  }

  return data.memory as UserMemoryFact;
}

async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke(`memory-crud/delete/${id}`, {
    method: 'DELETE',
  });

  if (error) {
    throw new Error(error.message || 'Failed to delete memory');
  }
}

async function bulkDeleteMemory(input: BulkDeleteInput): Promise<{ deleted_count: number }> {
  const { data, error } = await supabase.functions.invoke('memory-crud/bulk-delete', {
    body: input,
  });

  if (error) {
    throw new Error(error.message || 'Failed to bulk delete memories');
  }

  return data as { deleted_count: number };
}

async function exportMemory(format: 'json' | 'csv' = 'json'): Promise<Blob> {
  const { data, error } = await supabase.functions.invoke(`memory-crud/export?format=${format}`, {
    method: 'GET',
  });

  if (error) {
    throw new Error(error.message || 'Failed to export memories');
  }

  // Convert response to blob
  const content = format === 'csv' ? data : JSON.stringify(data, null, 2);
  const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
  return new Blob([content], { type: mimeType });
}

async function importMemory(memories: any[]): Promise<{ imported: number; skipped: number }> {
  const { data, error } = await supabase.functions.invoke('memory-crud/import', {
    body: { memories },
  });

  if (error) {
    throw new Error(error.message || 'Failed to import memories');
  }

  return data as { imported: number; skipped: number };
}

async function fetchMemorySettings(): Promise<MemorySettings> {
  const { data, error } = await supabase.functions.invoke('memory-settings', {
    method: 'GET',
  });

  if (error) {
    throw new Error(error.message || 'Failed to fetch memory settings');
  }

  return data.settings as MemorySettings;
}

async function updateMemorySettings(input: MemorySettingsUpdate): Promise<MemorySettings> {
  const { data, error } = await supabase.functions.invoke('memory-settings', {
    body: input,
    method: 'PUT',
  });

  if (error) {
    throw new Error(error.message || 'Failed to update memory settings');
  }

  return data.settings as MemorySettings;
}

async function clearLocalCache(): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('memory-settings/clear-cache', {
    method: 'POST',
  });

  if (error) {
    throw new Error(error.message || 'Failed to get cache clear instructions');
  }

  // Clear the specified keys
  const keysToClear = data.keys_to_clear || [];
  keysToClear.forEach((key: string) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {
      // Ignore storage errors
    }
  });

  return keysToClear;
}

// Hooks

/**
 * Fetch memory list with filters
 */
export function useMemoryList(filters: MemoryFilters = {}) {
  return useQuery({
    queryKey: memoryKeys.list(filters),
    queryFn: async () => {
      // Direct Supabase query for better reliability
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('user_memory')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_current', true)
        .order('created_at', { ascending: false });

      if (filters.category) query = query.eq('fact_category', filters.category);
      if (filters.source) query = query.eq('source_type', filters.source);
      if (filters.search) {
        query = query.or(`fact_value.ilike.%${filters.search}%,fact_label.ilike.%${filters.search}%`);
      }
      if (filters.startDate) query = query.gte('created_at', filters.startDate);
      if (filters.endDate) query = query.lte('created_at', filters.endDate);
      
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        memories: (data || []) as UserMemoryFact[],
        total: count || 0,
        limit,
        offset,
      };
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Fetch single memory item
 */
export function useMemoryItem(id: string | null) {
  return useQuery({
    queryKey: memoryKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_memory')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as UserMemoryFact;
    },
    enabled: !!id,
  });
}

/**
 * Create new memory with optimistic update
 */
export function useCreateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMemoryInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_memory')
        .insert({
          user_id: user.id,
          fact_key: input.fact_key,
          fact_category: input.fact_category,
          fact_label: input.fact_label,
          fact_value: input.fact_value,
          fact_context: input.fact_context,
          source_type: input.source_type || 'manual',
          confidence_score: input.confidence_score || 1.0,
          is_high_stakes: input.is_high_stakes || false,
          verification_status: 'verified',
          is_current: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserMemoryFact;
    },
    onMutate: async (newMemory) => {
      await queryClient.cancelQueries({ queryKey: memoryKeys.lists() });
      
      const previousData = queryClient.getQueryData(memoryKeys.list({}));
      
      // Optimistic update
      queryClient.setQueryData(memoryKeys.list({}), (old: MemoryListResponse | undefined) => {
        if (!old) return old;
        const optimisticMemory: UserMemoryFact = {
          id: 'temp-' + Date.now(),
          user_id: '',
          fact_key: newMemory.fact_key,
          fact_category: newMemory.fact_category,
          fact_label: newMemory.fact_label,
          fact_value: newMemory.fact_value,
          fact_context: newMemory.fact_context,
          confidence_score: newMemory.confidence_score || 1.0,
          is_high_stakes: newMemory.is_high_stakes || false,
          verification_status: 'verified',
          source_type: (newMemory.source_type || 'manual') as any,
          is_current: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return {
          ...old,
          memories: [optimisticMemory, ...old.memories],
          total: old.total + 1,
        };
      });

      return { previousData };
    },
    onError: (err, newMemory, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(memoryKeys.list({}), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
    },
  });
}

/**
 * Update memory with optimistic update
 */
export function useUpdateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateMemoryInput & { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_memory')
        .update(input)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserMemoryFact;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: memoryKeys.detail(id) });
      
      const previousData = queryClient.getQueryData(memoryKeys.detail(id));
      
      queryClient.setQueryData(memoryKeys.detail(id), (old: UserMemoryFact | undefined) => {
        if (!old) return old;
        return { ...old, ...updates, updated_at: new Date().toISOString() };
      });

      return { previousData };
    },
    onError: (err, { id }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(memoryKeys.detail(id), context.previousData);
      }
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
    },
  });
}

/**
 * Delete memory with optimistic update
 */
export function useDeleteMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_memory')
        .update({ is_current: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: memoryKeys.lists() });
      
      const previousData = queryClient.getQueryData(memoryKeys.list({}));
      
      queryClient.setQueryData(memoryKeys.list({}), (old: MemoryListResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          memories: old.memories.filter(m => m.id !== id),
          total: old.total - 1,
        };
      });

      return { previousData };
    },
    onError: (err, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(memoryKeys.list({}), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
    },
  });
}

/**
 * Bulk delete memories
 */
export function useBulkDeleteMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BulkDeleteInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('user_memory')
        .update({ is_current: false })
        .eq('user_id', user.id)
        .eq('is_current', true);

      if (input.ids && input.ids.length > 0) {
        query = query.in('id', input.ids);
      } else if (!input.delete_all) {
        if (input.category) query = query.eq('fact_category', input.category);
        if (input.source) query = query.eq('source_type', input.source);
        if (input.start_date) query = query.gte('created_at', input.start_date);
        if (input.end_date) query = query.lte('created_at', input.end_date);
      }

      const { error, count } = await query;
      if (error) throw error;

      return { deleted_count: count || 0 };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
    },
  });
}

/**
 * Export memories
 */
export function useExportMemory() {
  return useMutation({
    mutationFn: async (format: 'json' | 'csv' = 'json') => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_memory')
        .select('id, fact_key, fact_category, fact_label, fact_value, fact_context, confidence_score, verification_status, source_type, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const exportData = {
        exported_at: new Date().toISOString(),
        version: '1.0',
        count: data?.length || 0,
        memories: data || [],
      };

      if (format === 'csv') {
        const headers = ['id', 'fact_key', 'fact_category', 'fact_label', 'fact_value', 'fact_context', 'confidence_score', 'verification_status', 'source_type', 'created_at', 'updated_at'];
        const csvRows = [headers.join(',')];
        
        for (const memory of data || []) {
          const row = headers.map(h => {
            const val = (memory as any)[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          });
          csvRows.push(row.join(','));
        }

        return new Blob([csvRows.join('\n')], { type: 'text/csv' });
      }

      return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    },
  });
}

/**
 * Import memories
 */
export function useImportMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memories: any[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
          .eq('user_id', user.id)
          .eq('fact_key', memory.fact_key)
          .eq('is_current', true)
          .single();

        if (existing) {
          skipped++;
          continue;
        }

        const { error } = await supabase
          .from('user_memory')
          .insert({
            user_id: user.id,
            fact_key: memory.fact_key,
            fact_category: memory.fact_category,
            fact_label: memory.fact_label,
            fact_value: memory.fact_value,
            fact_context: memory.fact_context,
            confidence_score: memory.confidence_score || 1.0,
            is_high_stakes: memory.is_high_stakes || false,
            verification_status: memory.verification_status || 'verified',
            source_type: 'manual',
            is_current: true,
          });

        if (!error) {
          imported++;
        } else {
          skipped++;
        }
      }

      return { imported, skipped };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
    },
  });
}

/**
 * Fetch memory settings
 */
export function useMemorySettings() {
  return useQuery({
    queryKey: memoryKeys.settings(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Try to get existing settings
      let { data, error } = await supabase
        .from('user_memory_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Create default settings if not found
      if (error?.code === 'PGRST116' || !data) {
        const { data: newSettings, error: createError } = await supabase
          .from('user_memory_settings')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        data = newSettings;
      } else if (error) {
        throw error;
      }

      return data as MemorySettings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Update memory settings with optimistic update
 */
export function useUpdateMemorySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MemorySettingsUpdate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_memory_settings')
        .update(input)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as MemorySettings;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: memoryKeys.settings() });
      
      const previousData = queryClient.getQueryData(memoryKeys.settings());
      
      queryClient.setQueryData(memoryKeys.settings(), (old: MemorySettings | undefined) => {
        if (!old) return old;
        return { ...old, ...updates, updated_at: new Date().toISOString() };
      });

      return { previousData };
    },
    onError: (err, updates, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(memoryKeys.settings(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.settings() });
    },
  });
}

/**
 * Clear local cache
 */
export function useClearLocalCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const keysToClear = [
        'mindmaker-memory-draft',
        'mindmaker-memory-cache',
        'mindmaker-offline-memories',
      ];

      keysToClear.forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (e) {
          // Ignore storage errors
        }
      });

      return keysToClear;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.all });
    },
  });
}
