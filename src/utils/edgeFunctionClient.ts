import { supabase } from '@/integrations/supabase/client';

interface EdgeFunctionOptions {
  silent?: boolean;
  logPrefix?: string;
  showToast?: boolean;
}

interface EdgeFunctionResult<T = any> {
  data: T | null;
  error: any;
}

/**
 * Standardized edge function invocation with consistent error handling and logging
 * @param functionName - Name of the edge function to invoke
 * @param body - Request body to send to the function
 * @param options - Optional configuration for logging and error handling
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: any,
  options: EdgeFunctionOptions = {}
): Promise<EdgeFunctionResult<T>> {
  const { silent = false, logPrefix = '🔧' } = options;

  if (!silent) {
    console.log(`${logPrefix} Invoking edge function: ${functionName}`, { body });
  }

  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });

    if (error) {
      console.error(`❌ Edge function error (${functionName}):`, error);
      return { data: null, error };
    }

    if (!silent) {
      console.log(`✅ Edge function success (${functionName}):`, data);
    }

    return { data, error: null };
  } catch (error) {
    console.error(`❌ Edge function exception (${functionName}):`, error);
    return { data: null, error };
  }
}
