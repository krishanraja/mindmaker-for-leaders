/**
 * Timeout + single-retry wrapper for external API fetches.
 *
 * Why this exists:
 *   The briefing pipeline depends on Perplexity, Brave, Tavily, OpenAI,
 *   and ElevenLabs. Without a timeout, a single hung provider stalls the
 *   edge function until Supabase's wall clock kills it (~60s) and the
 *   user gets a generic 500. With a tight timeout + one retry on 5xx,
 *   we either get a clean response, a fast fallback, or a structured
 *   `provider_unavailable` signal that the frontend can render usefully.
 *
 * The retry is single-shot on purpose: legitimate 5xx is often transient
 * (provider hiccup) and one retry catches most of those. Anything past
 * one retry just slows down the user-visible failure path.
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  /** Wall-clock budget for the whole call including retries. Default 12s. */
  timeoutMs?: number;
  /** Retry once on 5xx + network errors. Default true. */
  retry?: boolean;
  /** Provider name for log messages (perplexity / elevenlabs / openai). */
  provider?: string;
}

/**
 * fetch() with a hard AbortController timeout and one retry on transient
 * failure. Returns the Response on success; throws ProviderUnavailableError
 * on terminal failure so the caller can produce a structured error response.
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const {
    timeoutMs = 12_000,
    retry = true,
    provider = "external",
    ...init
  } = options;

  const attempt = async (signal: AbortSignal): Promise<Response> => {
    return await fetch(url, { ...init, signal });
  };

  const tryOnce = async (): Promise<Response> => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await attempt(controller.signal);
    } finally {
      clearTimeout(t);
    }
  };

  let lastErr: unknown;
  let lastStatus: number | undefined;
  const maxAttempts = retry ? 2 : 1;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await tryOnce();
      // Retry on transient server errors. Don't retry on 4xx - those are
      // our problem to fix, not the provider's.
      if (res.status >= 500 && res.status < 600 && i < maxAttempts - 1) {
        lastStatus = res.status;
        // Drain the body so the connection can be reused.
        await res.text().catch(() => {});
        await sleep(300 + i * 200);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      console.warn(
        `[with-timeout] ${provider} attempt ${i + 1}/${maxAttempts} failed:`,
        isAbort ? `timeout after ${timeoutMs}ms` : (err instanceof Error ? err.message : String(err)),
      );
      if (i < maxAttempts - 1) {
        await sleep(300 + i * 200);
        continue;
      }
    }
  }

  throw new ProviderUnavailableError(provider, lastStatus, lastErr);
}

/**
 * Thrown after the final retry exhausts. Includes the provider name so the
 * caller can produce a structured response the frontend understands.
 */
export class ProviderUnavailableError extends Error {
  readonly provider: string;
  readonly lastStatus?: number;
  readonly cause?: unknown;
  constructor(provider: string, lastStatus?: number, cause?: unknown) {
    super(
      `Provider "${provider}" unavailable${lastStatus ? ` (last status ${lastStatus})` : ""}.`,
    );
    this.name = "ProviderUnavailableError";
    this.provider = provider;
    this.lastStatus = lastStatus;
    this.cause = cause;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The outer wall-clock bound, for anything that is not a raw fetch.
 *
 * fetchWithTimeout above is the right tool when we control the request, because
 * an AbortController actually cancels it. A supabase-js query builder, an SDK
 * call or any other thenable gives us no abort handle, so this bounds the
 * WAITING rather than the work: on expiry the caller gets a rejection with a
 * label it can log, and the underlying request is left to finish into nothing.
 *
 * That is the honest description of what it does, and it is still worth having:
 * the failure it prevents is a hung dependency holding an edge function until
 * the platform's own wall clock kills it, which surfaces to the caller as a
 * generic 500 with nothing in the logs saying which call hung.
 *
 * Accepts a PromiseLike, so a query builder can be passed in directly.
 */
export function withTimeout<T>(work: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
