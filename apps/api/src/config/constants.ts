/**
 * Central place for cross-cutting constants so magic strings never leak into
 * business logic.
 */
export const ACCESS_TOKEN_COOKIE = 'nexus_access_token';
export const REFRESH_TOKEN_COOKIE = 'nexus_refresh_token';
export const CSRF_HEADER = 'x-nexus-client';

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const METRIC_RANGES = ['7d', '30d', '90d', '12m'] as const;

export const RANGE_TO_DAYS: Record<(typeof METRIC_RANGES)[number], number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
};

export const BCRYPT_SALT_ROUNDS = 12;

/** Access token lives briefly; refresh token carries the long session. */
export const ACCESS_TOKEN_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
