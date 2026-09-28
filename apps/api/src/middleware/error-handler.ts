import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env';
import { HttpError } from '../utils/http-error';
import { logger } from '../lib/logger';

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    stack?: string;
  };
}

/**
 * Normalises every thrown value into a predictable JSON envelope:
 *   { success: false, error: { code, message, details } }
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId = res.locals.requestId as string | undefined;

  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong while processing the request.';
  let details: unknown;

  if (error instanceof HttpError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof z.ZodError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Request payload failed validation.';
    details = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      statusCode = 409;
      code = 'DUPLICATE_RESOURCE';
      const target = (error.meta?.target as string[] | string | undefined) ?? 'field';
      message = `A record with this ${Array.isArray(target) ? target.join(', ') : target} already exists.`;
    } else if (error.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND';
      message = 'The requested record does not exist.';
    } else if (error.code === 'P2003') {
      statusCode = 400;
      code = 'FOREIGN_KEY_VIOLATION';
      message = 'Related record constraint failed.';
    } else {
      statusCode = 400;
      code = `PRISMA_${error.code}`;
      message = 'Database request could not be completed.';
    }
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'Database is not reachable right now. Please retry shortly.';
  } else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    code = 'MALFORMED_JSON';
    message = 'Request body contains invalid JSON.';
  } else if (error instanceof Error) {
    message = env.isProduction ? message : error.message;
    details = env.isProduction ? undefined : { name: error.name };
    if (!env.isProduction) code = 'INTERNAL_ERROR_DEV';
  }

  if (statusCode >= 500) {
    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, error);
  } else if (!env.isTest) {
    logger.debug(`${statusCode} ${code} on ${req.method} ${req.originalUrl}: ${message}`);
  }

  const body: ErrorBody = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(requestId ? { requestId } : {}),
      ...(!env.isProduction && error instanceof Error && statusCode >= 500 ? { stack: error.stack } : {}),
    },
  };

  if (res.headersSent) return;
  res.status(statusCode).json(body);
}

export default errorHandler;
