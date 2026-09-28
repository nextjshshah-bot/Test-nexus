import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from '../config/env';
import { logger } from '../lib/logger';

/** Public health probes must never be blocked by cross-origin rules. */
const ALWAYS_ALLOWED = ['/health', '/api/v1/health'];

/**
 * CORS is enforced with an explicit allow-list. Requests with no Origin header
 * (curl, server-to-server, Railway health checks) are always permitted.
 */
export function buildCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes('*')) return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);
      if (!env.isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      // Sandbox preview hosts (*.e2b.app) and any Railway subdomain.
      if (/^https:\/\/[\w.-]+\.e2b\.app$/.test(origin)) return callback(null, true);
      if (/^https:\/\/[\w.-]+\.up\.railway\.app$/.test(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Nexus-Client'],
    exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 86_400,
  };
}

export function applySecurityMiddleware(app: Express): void {
  app.set('trust proxy', env.trustProxy ? 1 : false);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false, // the API serves JSON only
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cors(buildCorsOptions()));

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  if (!env.isTest) {
    morgan.token('requestId', (_req: Request, res: Response) => (res.locals.requestId as string) ?? '-');
    app.use(
      morgan(env.isProduction ? 'combined' : ':method :url :status :response-time[ms] - :requestId', {
        stream: {
          write: (message: string) => logger.info(message.trim()),
        },
        skip: (req) => req.path.includes('/health'),
      }),
    );
  }

  // Cache-control hygiene for authenticated JSON endpoints.
  app.use((req, res, next) => {
    if (!ALWAYS_ALLOWED.some((prefix) => req.path.startsWith(prefix))) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });
}

export const securityMiddleware = { applySecurityMiddleware, buildCorsOptions };
