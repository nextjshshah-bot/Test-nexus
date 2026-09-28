import type { Prisma, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  decodeExpiryToDate,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt';
import { env } from '../config/env';
import { HttpError } from '../utils/http-error';
import { percentChange, roundTo, toIso, toNumber } from '../utils/serialize';
import { recordActivity } from './activity.service';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '../schemas/auth.schema';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    company: user.company,
    jobTitle: user.jobTitle,
    avatarUrl: user.avatarUrl,
    lastLoginAt: toIso(user.lastLoginAt),
    createdAt: toIso(user.createdAt) as string,
    updatedAt: toIso(user.updatedAt) as string,
  };
}

async function issueSession(
  user: User,
  context: SessionContext,
): Promise<{ accessToken: string; refreshToken: string }> {
  const refreshRecord = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: 'pending',
      userAgent: context.userAgent?.slice(0, 255) ?? null,
      ipAddress: context.ipAddress?.slice(0, 64) ?? null,
      expiresAt: decodeExpiryToDate(env.jwt.refreshTtl),
    },
  });

  const refreshToken = signRefreshToken({ userId: user.id, tokenId: refreshRecord.id });

  await prisma.refreshToken.update({
    where: { id: refreshRecord.id },
    data: { tokenHash: hashToken(refreshToken) },
  });

  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });

  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput, context: SessionContext): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw HttpError.conflict('An account with this email already exists.', 'EMAIL_IN_USE');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      company: input.company ?? null,
      jobTitle: input.jobTitle ?? null,
      lastLoginAt: new Date(),
    },
  });

  const tokens = await issueSession(user, context);

  await recordActivity({
    action: 'USER_REGISTERED',
    userId: user.id,
    message: `${user.name} created a NexusCore workspace`,
    metadata: { email: user.email },
  });

  return { user: toPublicUser(user), ...tokens };
}

export async function loginUser(input: LoginInput, context: SessionContext): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Constant-ish response: verify against a dummy hash when the user is absent
  // so timing does not reveal whether the email exists.
  const dummyHash = '$2a$12$0000000000000000000000000000000000000000000000000000';
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : await verifyPassword(input.password, dummyHash);

  if (!user || !valid) {
    throw HttpError.unauthorized('Incorrect email or password.', 'INVALID_CREDENTIALS');
  }
  if (!user.isActive) {
    throw HttpError.forbidden('This account has been deactivated.', 'ACCOUNT_DEACTIVATED');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await issueSession(updated, context);

  await recordActivity({
    action: 'USER_LOGGED_IN',
    userId: user.id,
    message: `${updated.name} signed in`,
    metadata: { ipAddress: context.ipAddress ?? 'unknown' },
  });

  return { user: toPublicUser(updated), ...tokens };
}

export async function rotateRefreshToken(
  rawToken: string,
  context: SessionContext,
): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
  const claims = verifyRefreshToken(rawToken);
  const tokenHash = hashToken(rawToken);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.userId !== claims.sub) {
    // Possible token replay: kill every active session for that user.
    if (claims.sub) {
      await prisma.refreshToken.updateMany({
        where: { userId: claims.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    throw HttpError.unauthorized('Refresh token is no longer valid. Please sign in again.', 'REFRESH_TOKEN_REVOKED');
  }

  if (stored.revokedAt) {
    throw HttpError.unauthorized('Refresh token has been revoked. Please sign in again.', 'REFRESH_TOKEN_REVOKED');
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    throw HttpError.unauthorized('Session expired. Please sign in again.', 'REFRESH_TOKEN_EXPIRED');
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || !user.isActive) {
    throw HttpError.unauthorized('Account is unavailable.', 'USER_UNAVAILABLE');
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });

  // Rotate: revoke the presented token, mint a fresh one.
  const replacement = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    return tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: 'pending',
        userAgent: context.userAgent?.slice(0, 255) ?? null,
        ipAddress: context.ipAddress?.slice(0, 64) ?? null,
        expiresAt: decodeExpiryToDate(env.jwt.refreshTtl),
      },
    });
  });

  const refreshToken = signRefreshToken({ userId: user.id, tokenId: replacement.id });
  await prisma.refreshToken.update({
    where: { id: replacement.id },
    data: { tokenHash: hashToken(refreshToken) },
  });

  return { user: toPublicUser(user), accessToken, refreshToken };
}

export async function logoutUser(rawToken: string | undefined, userId: string | undefined): Promise<void> {
  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } else if (userId) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  if (userId) {
    await recordActivity({ action: 'USER_LOGGED_OUT', userId, message: 'Session ended' });
  }
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw HttpError.notFound('User account not found.', 'USER_NOT_FOUND');
  return toPublicUser(user);
}

export async function getProfileStats(userId: string) {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

  const [projectCount, activeSessions, projects, recentProjects] = await Promise.all([
    prisma.project.count({ where: { ownerId: userId } }),
    prisma.refreshToken.count({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    }),
    prisma.project.findMany({
      where: { ownerId: userId },
      select: { id: true, createdAt: true, status: true },
    }),
    prisma.project.count({ where: { ownerId: userId, createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  const createdLast30 = recentProjects;
  const createdPrevious30 = projects.filter(
    (project) => project.createdAt >= sixtyDaysAgo && project.createdAt < thirtyDaysAgo,
  ).length;

  return {
    projectCount,
    activeSessions,
    projectsCreatedLast30Days: createdLast30,
    projectGrowth: percentChange(createdLast30, createdPrevious30),
    activeProjects: projects.filter((project) => project.status === 'ACTIVE').length,
    completionRate: roundTo(
      projectCount === 0
        ? 0
        : (projects.filter((project) => project.status === 'COMPLETED').length / projectCount) * 100,
      1,
    ),
  };
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  const data: Prisma.UserUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.company !== undefined) data.company = input.company;
  if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;

  const user = await prisma.user.update({ where: { id: userId }, data });

  await recordActivity({
    action: 'PROFILE_UPDATED',
    userId,
    message: `${user.name} updated their profile`,
    metadata: { fields: Object.keys(data) as Prisma.InputJsonValue },
  });

  return toPublicUser(user);
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw HttpError.notFound('User account not found.', 'USER_NOT_FOUND');

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) throw HttpError.badRequest('Current password is incorrect.', 'INVALID_CURRENT_PASSWORD');

  const passwordHash = await hashPassword(input.newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    // Force re-authentication everywhere after a credential change.
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await recordActivity({
    action: 'PASSWORD_CHANGED',
    userId,
    message: `${user.name} changed their password. All other sessions were signed out.`,
  });
}

export async function listSessions(userId: string) {
  const sessions = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return sessions.map((session) => ({
    id: session.id,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  }));
}

export async function getAccountOverview(userId: string) {
  const user = await getCurrentUser(userId);
  const stats = await getProfileStats(userId);
  const plan = stats.projectCount > 24 ? 'Scale' : stats.projectCount > 9 ? 'Growth' : 'Starter';

  return {
    user,
    stats,
    plan,
    seatUsage: {
      used: 1 + Math.floor(stats.projectCount / 6),
      limit: plan === 'Starter' ? 3 : plan === 'Growth' ? 10 : 50,
    },
    usage: {
      apiCallsThisMonth: 18_420 + stats.projectCount * 137,
      storageUsedMb: roundTo(42.5 + stats.projectCount * 3.75, 2),
    },
    billing: {
      nextInvoiceDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      amountDue: roundTo(49 + toNumber(stats.projectCount) * 6.5, 2),
      currency: 'USD',
    },
  };
}

export const authService = {
  registerUser,
  loginUser,
  rotateRefreshToken,
  logoutUser,
  getCurrentUser,
  getProfileStats,
  updateProfile,
  changePassword,
  listSessions,
  getAccountOverview,
};
