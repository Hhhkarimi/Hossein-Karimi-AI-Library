import * as z from 'zod/v4';
export class FutureToolsError extends Error {
  constructor(public readonly code: string, message: string, public readonly retryAfterSeconds?: number) { super(message); this.name = 'FutureToolsError'; }
}
export function errorData(error: unknown) {
  if (error instanceof FutureToolsError) return { code: error.code, message: error.message, ...(error.retryAfterSeconds !== undefined ? { retry_after_seconds: error.retryAfterSeconds } : {}) };
  if (error instanceof z.ZodError) return { code: 'INVALID_ARGUMENTS', message: error.issues.slice(0, 6).map(i => `${i.path.join('.')}: ${i.message}`).join('; ').slice(0, 1000) };
  return { code: 'INTERNAL_ERROR', message: 'The operation could not be completed; no data absence is established.' };
}
