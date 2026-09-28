import os from 'node:os';
import { Router } from 'express';
import { isDatabaseHealthy } from '../lib/prisma';
import { env } from '../config/env';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const bootedAt = Date.now();

/** Liveness — the process is up and serving traffic. */
router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: env.appName,
      version: env.appVersion,
      environment: env.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

/** Readiness — dependencies (PostgreSQL) are reachable. Used by Railway. */
router.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const database = await isDatabaseHealthy();

    res.status(database ? 200 : 503).json({
      success: database,
      data: {
        status: database ? 'ready' : 'degraded',
        checks: {
          database: database ? 'up' : 'down',
          process: 'up',
        },
        bootedAt: new Date(bootedAt).toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
      },
    });
  }),
);

/** Detailed diagnostics (no secrets) for operators. */
router.get('/diagnostics', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: env.appName,
      version: env.appVersion,
      environment: env.nodeEnv,
      node: process.version,
      platform: `${os.type()} ${os.release()}`,
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg().map((value) => Math.round(value * 100) / 100),
      rateLimit: { windowMs: env.rateLimit.windowMs, max: env.rateLimit.max },
      corsOrigins: env.corsOrigins,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
