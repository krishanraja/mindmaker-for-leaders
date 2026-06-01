/**
 * Event Storage - Centralized Event Storage with Guards
 * 
 * Purpose: Provides anti-fragile event storage with:
 * - Validation of all required fields
 * - Safe defaults for optional fields
 * - Retry logic with exponential backoff
 * - Integrity checks before insert
 * - Always stores raw_input + structured_values
 * 
 * Key Features:
 * - Never stores null raw_input (uses placeholder if empty)
 * - Always stores structured_values (defaults to {})
 * - Links to question metadata from assessment_questions
 * - Stores context_snapshot with key inputs
 * - Handles session creation on-the-fly
 */

import { supabase } from '@/integrations/supabase/client';
import { sanitizeEventType, sanitizeToolName } from './pipelineGuards';

export interface EventData {
  assessmentId: string;
  sessionId: string | null;
  profileId: string | null;
  eventType: string;
  toolName: string;
  flowName?: string | null;
  questionId?: string | null;
  questionText: string;
  dimensionKey?: string | null;
  rawInput: string;
  structuredValues?: Record<string, any> | null;
  contextSnapshot?: Record<string, any> | null;
  responseDurationSeconds?: number | null;
}

export interface EventStorageResult {
  success: boolean;
  eventId: string | null;
  errors: string[];
  fallbacksUsed: string[];
}

/**
 * Validates event data and returns safe defaults
 */
function validateEventData(input: EventData): {
  valid: boolean;
  data: EventData;
  errors: string[];
  fallbacksUsed: string[];
} {
  const errors: string[] = [];
  const fallbacksUsed: string[] = [];

  const data: EventData = {
    assessmentId: input.assessmentId || '',
    sessionId: input.sessionId || null,
    profileId: input.profileId || null,
    eventType: sanitizeEventType(input.eventType),
    toolName: sanitizeToolName(input.toolName),
    flowName: input.flowName || null,
    questionId: input.questionId || null,
    questionText: input.questionText || '',
    dimensionKey: input.dimensionKey || null,
    rawInput: input.rawInput || '',
    structuredValues: input.structuredValues || {},
    contextSnapshot: input.contextSnapshot || {},
    responseDurationSeconds: input.responseDurationSeconds || null
  };

  // Validate required fields
  if (!data.assessmentId) {
    errors.push('assessmentId is required');
    return { valid: false, data, errors, fallbacksUsed };
  }

  if (!data.questionText || data.questionText.trim().length === 0) {
    // Try to get from question metadata if questionId provided
    if (data.questionId && data.toolName) {
      // Will be handled in storeEvent - use placeholder for now
      data.questionText = `Question ${data.questionId}`;
      fallbacksUsed.push('questionText');
    } else {
      errors.push('questionText is required');
      return { valid: false, data, errors, fallbacksUsed };
    }
  }

  // Ensure raw_input is never null/empty (use placeholder if needed)
  if (!data.rawInput || data.rawInput.trim().length === 0) {
    data.rawInput = '[No response provided]';
    fallbacksUsed.push('rawInput');
  }

  // Ensure structured_values is always an object
  if (!data.structuredValues || typeof data.structuredValues !== 'object') {
    data.structuredValues = {};
    fallbacksUsed.push('structuredValues');
  }

  // Ensure context_snapshot is always an object
  if (!data.contextSnapshot || typeof data.contextSnapshot !== 'object') {
    data.contextSnapshot = {};
    fallbacksUsed.push('contextSnapshot');
  }

  // Track if eventType or toolName were sanitized
  if (input.eventType !== data.eventType) {
    fallbacksUsed.push('eventType');
  }
  if (input.toolName !== data.toolName) {
    fallbacksUsed.push('toolName');
  }

  return {
    valid: errors.length === 0,
    data,
    errors,
    fallbacksUsed
  };
}

/**
 * Ensures session exists, creates if needed
 */
async function ensureSession(sessionId: string | null): Promise<string | null> {
  if (!sessionId) {
    return null; // Anonymous session - no need to create
  }

  try {
    // Check if session exists
    const { data: existingSession } = await supabase
      .from('conversation_sessions')
      .select('id')
      .eq('id', sessionId)
      .maybeSingle();

    if (existingSession) {
      return sessionId;
    }

    // Create session if it doesn't exist
    const { data: newSession, error: createError } = await supabase
      .from('conversation_sessions')
      .insert({
        id: sessionId,
        session_type: 'ai_assessment',
        started_at: new Date().toISOString(),
        status: 'active'
      })
      .select('id')
      .single();

    if (createError || !newSession) {
      console.warn('⚠️ Failed to create session, will use null:', createError?.message);
      return null;
    }

    return newSession.id;
  } catch (error) {
    console.warn('⚠️ Error ensuring session, will use null:', error);
    return null;
  }
}

/**
 * Validates foreign key references before insert
 */
async function validateForeignKeys(data: EventData): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Validate assessment_id exists
  if (data.assessmentId) {
    const { data: assessment, error: assessmentError } = await supabase
      .from('leader_assessments')
      .select('id')
      .eq('id', data.assessmentId)
      .maybeSingle();

    if (assessmentError) {
      errors.push(`Assessment lookup failed: ${assessmentError.message}`);
    } else if (!assessment) {
      errors.push(`Assessment not found: ${data.assessmentId}`);
    }
  }

  // Validate profile_id exists (if provided)
  if (data.profileId) {
    const { data: profile, error: profileError } = await supabase
      .from('leaders')
      .select('id')
      .eq('id', data.profileId)
      .is('archived_at', null) // Only active profiles
      .maybeSingle();

    if (profileError) {
      errors.push(`Profile lookup failed: ${profileError.message}`);
    } else if (!profile) {
      errors.push(`Profile not found or archived: ${data.profileId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Stores a single event with retry logic and integrity checks
 */
export async function storeEvent(
  eventData: EventData,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    skipFkValidation?: boolean;
  } = {}
): Promise<EventStorageResult> {
  const { maxRetries = 3, retryDelay = 1000, skipFkValidation = false } = options;
  const errors: string[] = [];
  const fallbacksUsed: string[] = [];

  try {
    // Step 1: Validate and normalize event data
    const validation = validateEventData(eventData);
    if (!validation.valid) {
      return {
        success: false,
        eventId: null,
        errors: validation.errors,
        fallbacksUsed: validation.fallbacksUsed
      };
    }

    const validatedData = validation.data;
    fallbacksUsed.push(...validation.fallbacksUsed);

    // Step 2: Ensure session exists
    const sessionId = await ensureSession(validatedData.sessionId);
    if (validatedData.sessionId && !sessionId) {
      console.warn('⚠️ Session creation failed, proceeding without session');
      validatedData.sessionId = null;
      fallbacksUsed.push('sessionId');
    } else {
      validatedData.sessionId = sessionId;
    }

    // Step 3: Validate foreign keys (if not skipped)
    if (!skipFkValidation) {
      const fkValidation = await validateForeignKeys(validatedData);
      if (!fkValidation.valid) {
        errors.push(...fkValidation.errors);
        // Don't fail completely - log and continue (FK validation might fail due to RLS)
        console.warn('⚠️ FK validation warnings:', fkValidation.errors);
      }
    }

    // Step 4: Try to get question metadata if questionId provided
    if (validatedData.questionId && validatedData.toolName) {
      try {
        const { data: questionMeta } = await supabase
          .rpc('get_question_metadata', {
            p_tool_name: validatedData.toolName,
            p_question_id: validatedData.questionId
          })
          .single();

        if (questionMeta) {
          // Enhance context_snapshot with question metadata
          validatedData.contextSnapshot = {
            ...validatedData.contextSnapshot,
            question_metadata: {
              dimension_key: questionMeta.dimension_key,
              weight: questionMeta.weight,
              question_block: questionMeta.question_block
            }
          };

          // Use question_text from metadata if our questionText is a placeholder
          if (validatedData.questionText.startsWith('Question ')) {
            validatedData.questionText = questionMeta.question_text;
          }

          // Use dimension_key from metadata if not provided
          if (!validatedData.dimensionKey && questionMeta.dimension_key) {
            validatedData.dimensionKey = questionMeta.dimension_key;
          }
        }
      } catch (error) {
        // Non-fatal - continue without question metadata
        console.warn('⚠️ Failed to fetch question metadata:', error);
      }
    }

    // Step 5: Insert with retry logic
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const insertData = {
          assessment_id: validatedData.assessmentId,
          session_id: validatedData.sessionId,
          profile_id: validatedData.profileId,
          event_type: validatedData.eventType,
          tool_name: validatedData.toolName,
          flow_name: validatedData.flowName,
          question_id: validatedData.questionId,
          question_text: validatedData.questionText,
          dimension_key: validatedData.dimensionKey,
          raw_input: validatedData.rawInput,
          structured_values: validatedData.structuredValues,
          context_snapshot: validatedData.contextSnapshot,
          response_duration_seconds: validatedData.responseDurationSeconds,
          created_at: new Date().toISOString()
        };

        const { data: insertedEvent, error: insertError } = await supabase
          .from('assessment_events')
          .insert(insertData)
          .select('id')
          .single();

        if (insertError) {
          lastError = insertError;
          
          // Check if it's a retryable error
          const isRetryable = 
            insertError.code === 'PGRST116' || // Network error
            insertError.code === '57014' || // Query timeout
            insertError.message?.includes('timeout') ||
            insertError.message?.includes('network');

          if (isRetryable && attempt < maxRetries) {
            const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
            console.warn(`⚠️ Insert failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // Non-retryable error or max retries reached
          errors.push(`Insert failed: ${insertError.message}`);
          return {
            success: false,
            eventId: null,
            errors,
            fallbacksUsed
          };
        }

        if (!insertedEvent || !insertedEvent.id) {
          errors.push('Insert succeeded but no event ID returned');
          return {
            success: false,
            eventId: null,
            errors,
            fallbacksUsed
          };
        }

        console.log(`✅ Event stored successfully: ${insertedEvent.id}`);
        return {
          success: true,
          eventId: insertedEvent.id,
          errors,
          fallbacksUsed
        };
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1);
          console.warn(`⚠️ Insert exception (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // All retries exhausted
    errors.push(`Insert failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    return {
      success: false,
      eventId: null,
      errors,
      fallbacksUsed
    };
  } catch (error: any) {
    console.error('❌ Unexpected error in storeEvent:', error);
    errors.push(`Unexpected error: ${error.message || String(error)}`);
    return {
      success: false,
      eventId: null,
      errors,
      fallbacksUsed
    };
  }
}

/**
 * Stores multiple events in batch
 */
export async function storeEvents(
  events: EventData[],
  options: {
    maxRetries?: number;
    retryDelay?: number;
    skipFkValidation?: boolean;
    batchSize?: number;
  } = {}
): Promise<{
  success: boolean;
  stored: number;
  failed: number;
  errors: string[];
  fallbacksUsed: string[];
}> {
  const { batchSize = 10 } = options;
  const errors: string[] = [];
  const fallbacksUsed: string[] = [];
  let stored = 0;
  let failed = 0;

  // Process in batches to avoid overwhelming the database
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(event => storeEvent(event, options))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const eventResult = result.value;
        if (eventResult.success) {
          stored++;
        } else {
          failed++;
          errors.push(...eventResult.errors);
        }
        fallbacksUsed.push(...eventResult.fallbacksUsed);
      } else {
        failed++;
        errors.push(`Event ${i + index} failed: ${result.reason}`);
      }
    });
  }

  return {
    success: failed === 0,
    stored,
    failed,
    errors,
    fallbacksUsed
  };
}
