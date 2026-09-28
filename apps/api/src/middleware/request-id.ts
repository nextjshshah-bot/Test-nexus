import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Attach a correlation id to every request for log/trace stitching. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.length <= 128 ? incoming : crypto.randomUUID();

  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

export default requestId;
