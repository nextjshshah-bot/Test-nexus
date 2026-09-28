import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

/**
 * Load `.env` from the workspace root, the API package root, or the current
 * working directory — whichever exists first. In production (Railway) the
 * variables come from the platform, so `.env` files are optional.
 */
function loadEnvFiles(): void {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate, override: false });
    }
  }
}

loadEnvFiles();

export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  isTest: boolean;
  port: number;
  apiPrefix: string;
  databaseUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
    issuer: string;
    audience: string;
  };
  corsOrigins: string[];
  cookie: {
    domain?: string;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
  };
  rateLimit: {
    windowMs: number;
    max: number;
    authMax: number;
  };
  logLevel: string;
  runMigrationsOnBoot: boolean;
  trustProxy: boolean;
  appName: string;
  appVersion: string;
}

function readString(key: string, fallback: string): string {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') return fallback;
  return value.trim();
}

function readOptionalString(key: string): string | undefined {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') return undefined;
  return value.trim();
}

function readNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function readBoolean(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

const nodeEnv = readString('NODE_ENV', 'development') as NodeEnv;
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

const fallbackSecret = 'nexuscore_insecure_development_secret_key_do_not_use_in_prod';

export const env: AppConfig = {
  nodeEnv,
  isProduction,
  isTest,
  port: readNumber('PORT', 4000),
  apiPrefix: readString('API_PREFIX', '/api/v1'),
  databaseUrl: readString(
    'DATABASE_URL',
    'postgresql://nexus:nexus_dev_password@127.0.0.1:5432/nexuscore?schema=public',
  ),
  jwt: {
    accessSecret: readString('JWT_ACCESS_SECRET', fallbackSecret),
    refreshSecret: readString('JWT_REFRESH_SECRET', `${fallbackSecret}_refresh`),
    accessTtl: readString('JWT_ACCESS_TTL', '15m'),
    refreshTtl: readString('JWT_REFRESH_TTL', '30d'),
    issuer: readString('JWT_ISSUER', 'nexuscore-api'),
    audience: readString('JWT_AUDIENCE', 'nexuscore-web'),
  },
  corsOrigins: readString('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
  cookie: {
    domain: readOptionalString('COOKIE_DOMAIN'),
    secure: readBoolean('COOKIE_SECURE', isProduction),
    sameSite: readString('COOKIE_SAME_SITE', 'lax') as 'lax' | 'strict' | 'none',
  },
  rateLimit: {
    windowMs: readNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    max: readNumber('RATE_LIMIT_MAX', 300),
    authMax: readNumber('AUTH_RATE_LIMIT_MAX', 25),
  },
  logLevel: readString('LOG_LEVEL', isProduction ? 'info' : 'debug'),
  runMigrationsOnBoot: readBoolean('RUN_MIGRATIONS_ON_BOOT', false),
  trustProxy: readBoolean('TRUST_PROXY', isProduction),
  appName: 'NexusCore API',
  appVersion: process.env.npm_package_version ?? '1.0.0',
};

/**
 * Fail fast on unsafe production configuration. Called during boot so a
 * misconfigured deploy dies loudly instead of silently issuing weak tokens.
 */
export function assertProductionSafety(): void {
  const problems: string[] = [];

  if (env.isProduction) {
    if (env.jwt.accessSecret.includes('change_me') || env.jwt.accessSecret.includes('insecure')) {
      problems.push('JWT_ACCESS_SECRET is still a placeholder value.');
    }
    if (env.jwt.refreshSecret.includes('change_me') || env.jwt.refreshSecret.includes('insecure')) {
      problems.push('JWT_REFRESH_SECRET is still a placeholder value.');
    }
    if (env.jwt.accessSecret.length < 32) problems.push('JWT_ACCESS_SECRET must be >= 32 characters.');
    if (env.jwt.refreshSecret.length < 32) problems.push('JWT_REFRESH_SECRET must be >= 32 characters.');
    if (env.jwt.accessSecret === env.jwt.refreshSecret) {
      problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.');
    }
    if (!env.databaseUrl.startsWith('postgres')) {
      problems.push('DATABASE_URL must point at PostgreSQL in production.');
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid production configuration:\n  - ${problems.join('\n  - ')}`);
  }
}

export const isProd = isProduction;
export const isDev = nodeEnv === 'development';
export const isTesting = isTest;
