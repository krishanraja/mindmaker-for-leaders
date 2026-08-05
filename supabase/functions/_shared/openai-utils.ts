/**
 * OpenAI API Utilities
 * 
 * Provides optimized OpenAI API calls with caching, model selection, and streaming support
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { fetchWithTimeout } from './with-timeout.ts';

export interface OpenAIRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: string };
}

export interface OpenAICacheOptions {
  useCache?: boolean;
  cacheKey?: string;
  supabase?: any;
}

export interface OpenAIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cached?: boolean;
}

/**
 * Select appropriate OpenAI model based on task complexity.
 * If a supabase client and routerTaskName are provided, delegates to the
 * dynamic model router (when MODEL_ROUTING_ENABLED=true). Otherwise,
 * returns the hardcoded default.
 */
export function selectModel(task: 'chat' | 'analysis' | 'simple' | 'complex'): string {
  const models = {
    simple: 'gpt-4o-mini', // Fast, cheap for simple tasks
    chat: 'gpt-4o', // Balanced for conversations
    analysis: 'gpt-4o', // Good for structured analysis
    complex: 'gpt-4o', // Best for complex reasoning
  };

  return models[task] || 'gpt-4o';
}

/**
 * Select model via dynamic routing (async).
 * Falls back to selectModel() if routing is unavailable.
 */
export async function selectModelDynamic(
  task: 'chat' | 'analysis' | 'simple' | 'complex',
  routerTaskName: string,
  supabase: any
): Promise<string> {
  try {
    const { selectOptimalModel } = await import("./model-router.ts");
    const selection = await selectOptimalModel(routerTaskName, supabase);
    return selection.model;
  } catch {
    return selectModel(task);
  }
}

/**
 * Generate cache key from request
 */
function generateCacheKey(messages: Array<{ role: string; content: string }>, model: string): string {
  // Normalize messages for consistent caching
  const normalized = messages
    .map(m => `${m.role}:${m.content.trim().toLowerCase()}`)
    .join('|');
  
  // Create hash (simple hash for Deno)
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `openai:${model}:${Math.abs(hash).toString(36)}`;
}

/**
 * Check cache for existing response
 */
async function getCachedResponse(
  cacheKey: string,
  supabase: any
): Promise<OpenAIResponse | null> {
  try {
    const { data, error } = await supabase
      .from('ai_cache')
      .select('response_data, model')
      .eq('cache_key', cacheKey)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      content: data.response_data.content || data.response_data,
      model: data.model,
      cached: true,
    };
  } catch (error) {
    console.warn('Cache lookup error:', error);
    return null;
  }
}

/**
 * Store response in cache
 */
async function cacheResponse(
  cacheKey: string,
  response: OpenAIResponse,
  supabase: any
): Promise<void> {
  try {
    await supabase
      .from('ai_cache')
      .insert({
        cache_key: cacheKey,
        prompt_hash: cacheKey,
        response_data: { content: response.content },
        model: response.model,
        usage_tokens: response.usage?.total_tokens || 0,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });
  } catch (error) {
    console.warn('Cache store error:', error);
    // Don't throw - caching failure shouldn't break the request
  }
}

/**
 * Call OpenAI API with caching and optimization
 */
export async function callOpenAI(
  request: OpenAIRequest,
  options: OpenAICacheOptions = {}
): Promise<OpenAIResponse> {
  const {
    useCache = true,
    cacheKey: providedCacheKey,
    supabase,
  } = options;
  
  const model = request.model || selectModel('chat');
  const cacheKey = providedCacheKey || generateCacheKey(request.messages, model);
  
  // Try cache first
  if (useCache && supabase) {
    const cached = await getCachedResponse(cacheKey, supabase);
    if (cached) {
      console.log('✅ Using cached OpenAI response');
      return cached;
    }
  }
  
  // Call OpenAI API
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  
  const apiRequest = {
    model: model,
    messages: request.messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.max_tokens ?? 2000,
    stream: request.stream ?? false,
    ...(request.response_format && { response_format: request.response_format }),
  };
  
  // Bounds time-to-headers only; the timer clears once the response starts,
  // so streaming bodies are unaffected.
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    provider: 'openai',
    timeoutMs: 90_000,
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiRequest),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';
  const usage = data.usage;
  
  const result: OpenAIResponse = {
    content,
    model: data.model || model,
    usage,
    cached: false,
  };
  
  // Cache the response
  if (useCache && supabase && content) {
    await cacheResponse(cacheKey, result, supabase);
  }
  
  return result;
}

/**
 * Call OpenAI with streaming support
 */
export async function* streamOpenAI(
  request: OpenAIRequest,
  options: { model?: string } = {}
): AsyncGenerator<string, void, unknown> {
  const model = options.model || request.model || selectModel('chat');
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  
  const apiRequest = {
    model: model,
    messages: request.messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.max_tokens ?? 2000,
    stream: true,
  };
  
  // Bounds time-to-headers only; the timer clears once the response starts,
  // so streaming bodies are unaffected.
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    provider: 'openai',
    timeoutMs: 90_000,
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiRequest),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  if (!reader) {
    throw new Error('No response body');
  }
  
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return;
        }
        
        try {
          const json = JSON.parse(data);
          const delta = json.choices[0]?.delta?.content;
          if (delta) {
            yield delta;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}







