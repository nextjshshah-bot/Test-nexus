/**
 * Typed HTTP error used across the API. Controllers throw these; the central
 * error handler turns them into RFC-7807-ish JSON responses.
 */
export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly expose: boolean;

  constructor(statusCode: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = statusCode < 500;
    Error.captureStackTrace?.(this, HttpError);
  }

  static badRequest(message = 'Bad request', code = 'BAD_REQUEST', details?: unknown): HttpError {
    return new HttpError(400, message, code, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED'): HttpError {
    return new HttpError(401, message, code);
  }

  static forbidden(message = 'You do not have access to this resource', code = 'FORBIDDEN'): HttpError {
    return new HttpError(403, message, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): HttpError {
    return new HttpError(404, message, code);
  }

  static conflict(message = 'Resource already exists', code = 'CONFLICT'): HttpError {
    return new HttpError(409, message, code);
  }

  static unprocessable(message = 'Validation failed', code = 'VALIDATION_ERROR', details?: unknown): HttpError {
    return new HttpError(422, message, code, details);
  }

  static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMITED'): HttpError {
    return new HttpError(429, message, code);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR', details?: unknown): HttpError {
    return new HttpError(500, message, code, details);
  }

  static serviceUnavailable(message = 'Service unavailable', code = 'SERVICE_UNAVAILABLE'): HttpError {
    return new HttpError(503, message, code);
  }
}

export default HttpError;
