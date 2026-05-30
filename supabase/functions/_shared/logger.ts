/**
 * Structured logger for edge functions.
 *
 * Why this exists:
 *   Until now every edge function used `console.log/warn/error` with ad-hoc
 *   string formatting. That's fine for one-off debugging but useless for
 *   alerting, aggregation, or finding "all errors from generate-briefing
 *   for user X today". Supabase Logs UI parses JSON output natively, so a
 *   thin shim that emits one JSON line per event gives us structured fields
 *   without adopting a heavy logging framework.
 *
 * Output shape (one JSON object per line, written to stdout):
 *   {
 *     "ts":     "2026-04-26T12:34:56.789Z",
 *     "level":  "info" | "warn" | "error",
 *     "fn":     "generate-briefing",        // function name
 *     "msg":    "Briefing generated",
 *     "userId": "uuid-...",                 // optional context
 *     "duration_ms": 8420,                  // optional
 *     "error":  { "name": "...", "message": "..." }  // on errors
 *   }
 *
 * Usage:
 *   const log = createLogger("generate-briefing");
 *   log.info("Pipeline complete", { userId, duration_ms: 8420 });
 *   log.error("ElevenLabs timed out", { userId, error: e });
 *
 * Sinks: Supabase Logs picks up stdout JSON automatically. To wire to
 * Datadog/Sentry/Logflare, add a fan-out in `emit()` (e.g. fetch to a
 * collector endpoint) - that's the single chokepoint to extend.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  // Free-form key/value context. Common keys:
  userId?: string;
  briefingId?: string;
  duration_ms?: number;
  status?: number;
  provider?: string;
  // Anything else the caller wants serialised.
  [key: string]: unknown;
}

export interface Logger {
  debug(msg: string, ctx?: LogContext): void;
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, ctx?: LogContext): void;
  /** Returns a child logger that merges baseCtx into every event. */
  withContext(baseCtx: LogContext): Logger;
}

function emit(level: LogLevel, fn: string, msg: string, ctx: LogContext = {}): void {
  // Normalise Error instances under `ctx.error` so they actually serialise.
  const normalised: Record<string, unknown> = { ...ctx };
  if (normalised.error instanceof Error) {
    const err = normalised.error;
    normalised.error = {
      name: err.name,
      message: err.message,
      // Stack is verbose; emit only the first 5 lines.
      stack: err.stack?.split("\n").slice(0, 5).join("\n"),
    };
  }
  const record = {
    ts: new Date().toISOString(),
    level,
    fn,
    msg,
    ...normalised,
  };
  // Use the matching console method so existing log levels in Supabase
  // Logs UI keep working (info → console.log, warn → console.warn, etc.).
  const line = JSON.stringify(record);
  switch (level) {
    case "debug":
    case "info":
      console.log(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export function createLogger(fn: string, baseCtx: LogContext = {}): Logger {
  const merge = (ctx?: LogContext): LogContext =>
    ctx ? { ...baseCtx, ...ctx } : baseCtx;
  return {
    debug: (msg, ctx) => emit("debug", fn, msg, merge(ctx)),
    info: (msg, ctx) => emit("info", fn, msg, merge(ctx)),
    warn: (msg, ctx) => emit("warn", fn, msg, merge(ctx)),
    error: (msg, ctx) => emit("error", fn, msg, merge(ctx)),
    withContext: (extra) => createLogger(fn, { ...baseCtx, ...extra }),
  };
}
