import crypto from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/http-error';

export interface AccessTokenClaims extends JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access';
}

export interface RefreshTokenClaims extends JwtPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export function signAccessToken(payload: { userId: string; email: string; role: string }): string {
  const options: SignOptions = {
    expiresIn: env.jwt.accessTtl as SignOptions['expiresIn'],
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
  };

  return jwt.sign(
    { email: payload.email, role: payload.role, type: 'access' },
    env.jwt.accessSecret,
    { ...options, subject: payload.userId },
  );
}

export function signRefreshToken(payload: { userId: string; tokenId: string }): string {
  const options: SignOptions = {
    expiresIn: env.jwt.refreshTtl as SignOptions['expiresIn'],
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
  };

  return jwt.sign({ jti: payload.tokenId, type: 'refresh' }, env.jwt.refreshSecret, {
    ...options,
    subject: payload.userId,
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret, {
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
    });

    if (typeof decoded === 'string' || decoded.type !== 'access') {
      throw new HttpError(401, 'Invalid access token type', 'INVALID_TOKEN_TYPE');
    }

    return decoded as AccessTokenClaims;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw new HttpError(401, 'Access token expired', 'TOKEN_EXPIRED');
    }
    throw new HttpError(401, 'Invalid or malformed access token', 'INVALID_TOKEN');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  try {
    const decoded = jwt.verify(token, env.jwt.refreshSecret, {
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
    });

    if (typeof decoded === 'string' || decoded.type !== 'refresh') {
      throw new HttpError(401, 'Invalid refresh token type', 'INVALID_TOKEN_TYPE');
    }

    return decoded as RefreshTokenClaims;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw new HttpError(401, 'Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }
    throw new HttpError(401, 'Invalid or malformed refresh token', 'INVALID_REFRESH_TOKEN');
  }
}

/**
 * Refresh tokens are stored hashed (SHA-256) so a database leak does not hand
 * an attacker live sessions. SHA-256 is appropriate here because the token is
 * already high-entropy random data — no need for a slow KDF.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function decodeExpiryToDate(ttl: string): Date {
  const match = /^(\d+)\s*([smhd])$/.exec(ttl.trim());
  const now = Date.now();

  if (!match) return new Date(now + 30 * 24 * 60 * 60 * 1000);

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(now + amount * multipliers[unit]);
}
