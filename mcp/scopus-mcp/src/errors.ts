export class ScopusError extends Error {
  constructor(public readonly code: string, message: string,
    public readonly retryAfterSeconds?: number, public readonly status?: number) {
    super(message); this.name = 'ScopusError';
  }
}
export function errorData(error: unknown) {
  if (error instanceof ScopusError) return { code: error.code, message: error.message,
    ...(error.retryAfterSeconds !== undefined ? { retry_after_seconds: error.retryAfterSeconds } : {}) };
  return { code: 'INTERNAL_ERROR', message: 'The Scopus request could not be completed.' };
}
