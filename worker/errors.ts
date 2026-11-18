export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export const isRecoverable = (err: unknown) =>
  err instanceof HttpError ? err.status === 429 || err.status >= 500 : true;
