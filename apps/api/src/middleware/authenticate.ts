import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '@prisma/client';
import { ACCESS_TOKEN_COOKIE } from '../config/constants';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { HttpError } from '../utils/http-error';

function extractToken(req: Request): string | null {
  const header = req.header('authorization');
  if (header && header.toLowerCase().startsWith('bearer ')) {
    const token = header.slice(7).trim();
    if (token.length > 0) return token;
  }

  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[ACCESS_TOKEN_COOKIE];
  if (cookieToken && cookieToken.length > 0) return cookieToken;

  return null;
}

/**
 * Verifies the JWT and loads the user from the database on every request.
 * The extra read guarantees deactivated/deleted accounts lose access instantly
 * instead of waiting for the token to expire.
 */
export const authenticate: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) throw HttpError.unauthorized('Missing authentication token', 'TOKEN_MISSING');

    const claims = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) throw HttpError.unauthorized('Account no longer exists', 'USER_NOT_FOUND');
    if (!user.isActive) throw HttpError.forbidden('Account has been deactivated', 'ACCOUNT_DEACTIVATED');

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
};

/** Optional auth: attaches the user when a valid token exists, never throws. */
export const optionalAuthenticate: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) return next();

    const claims = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (user && user.isActive) {
      req.user = { id: user.id, email: user.email, role: user.role };
    }
    next();
  } catch {
    next();
  }
};

/** Role gate — compose after `authenticate`. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(HttpError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(HttpError.forbidden('Insufficient permissions for this action', 'ROLE_FORBIDDEN'));
    }
    next();
  };
}

export default authenticate;
