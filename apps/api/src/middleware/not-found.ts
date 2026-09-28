import type { Request, Response } from 'express';

/** Catch-all for unmatched routes — keeps 404s in the same JSON envelope. */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = res.locals.requestId as string | undefined;

  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `No route matches ${req.method} ${req.originalUrl}`,
      ...(requestId ? { requestId } : {}),
    },
  });
}

export default notFoundHandler;
