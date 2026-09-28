import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';

export interface RequestSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validates and *replaces* request fragments with parsed output, so handlers
 * always receive coerced, type-safe data.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query) as Request['query'];
      if (schemas.params) req.params = schemas.params.parse(req.params) as Request['params'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
        return;
      }
      next(error);
    }
  };
}

export default validate;
