// Errors the UI can react to. Database errors are translated here so screens never
// need to know PostgreSQL error codes.
export class AppError extends Error {
  constructor(message, { code, cause } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.cause = cause;
  }
}
export class AuthorizationError extends AppError {}  // not allowed (role)
export class ValidationError extends AppError {}     // bad input or a business rule said no
export class NotFoundError extends AppError {}

const VALIDATION_CODES = new Set(['22023', '23502', '23503', '23505', '23514']);

export function fromPostgrestError(error) {
  const code = error?.code;
  const message = error?.message || 'Unexpected database error';
  if (code === '42501') return new AuthorizationError(message, { code, cause: error });
  if (code === 'P0002') return new NotFoundError(message, { code, cause: error });
  if (VALIDATION_CODES.has(code)) return new ValidationError(message, { code, cause: error });
  return new AppError(message, { code, cause: error });
}