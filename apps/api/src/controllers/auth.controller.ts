import type { CookieOptions, Request, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
} from '../config/constants';
import { env } from '../config/env';
import * as authService from '../services/auth.service';
import { assessPasswordStrength } from '../lib/password';
import { HttpError } from '../utils/http-error';
import type { RequestContext } from '../types/context';

function cookieBase(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: '/',
    ...(env.cookie.domain ? { domain: env.cookie.domain } : {}),
  };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieBase(),
    maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...cookieBase(),
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, cookieBase());
  res.clearCookie(REFRESH_TOKEN_COOKIE, cookieBase());
}

function sessionContext(req: Request): RequestContext {
  return {
    userAgent: req.header('user-agent'),
    ipAddress: req.ip,
  };
}

/**
 * The token pair is returned in the JSON body AND as httpOnly cookies. The web
 * client stores the access token in memory for the Authorization header and
 * relies on cookies for session recovery after a reload.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.registerUser(req.body, sessionContext(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: ACCESS_TOKEN_COOKIE_MAX_AGE_MS / 1000,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.loginUser(req.body, sessionContext(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: ACCESS_TOKEN_COOKIE_MAX_AGE_MS / 1000,
    },
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_TOKEN_COOKIE];
  const token = fromBody ?? fromCookie;

  if (!token) throw HttpError.unauthorized('No refresh token supplied.', 'REFRESH_TOKEN_MISSING');

  const result = await authService.rotateRefreshToken(token, sessionContext(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: ACCESS_TOKEN_COOKIE_MAX_AGE_MS / 1000,
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_TOKEN_COOKIE];
  const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;

  await authService.logoutUser(fromBody ?? fromCookie, req.user?.id);
  clearAuthCookies(res);

  res.status(200).json({ success: true, data: { message: 'Signed out successfully.' } });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const data = await authService.getAccountOverview(req.user.id);

  res.status(200).json({ success: true, data });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const user = await authService.updateProfile(req.user.id, req.body);

  res.status(200).json({ success: true, data: { user } });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  await authService.changePassword(req.user.id, req.body);
  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    data: { message: 'Password updated. Please sign in again with your new password.' },
  });
}

export async function sessions(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const data = await authService.listSessions(req.user.id);

  res.status(200).json({ success: true, data: { sessions: data } });
}

export async function revokeAllSessions(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  await authService.logoutUser(undefined, req.user.id);
  clearAuthCookies(res);

  res.status(200).json({ success: true, data: { message: 'All sessions revoked.' } });
}

export async function passwordStrength(req: Request, res: Response): Promise<void> {
  const { password } = req.body as { password: string };
  res.status(200).json({ success: true, data: assessPasswordStrength(password) });
}

export const authController = {
  register,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  changePassword,
  sessions,
  revokeAllSessions,
  passwordStrength,
};
