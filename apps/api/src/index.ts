import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createApp } from './app';
import { assertProductionSafety, env } from './config/env';
import { connectDatabase, disconnectDatabase } from './lib/prisma';
import { logger } from './lib/logger';

const execFileAsync = promisify(execFile);

/**
 * Applies pending Prisma migrations before accepting traffic when
 * RUN_MIGRATIONS_ON_BOOT=true (the default on Railway). Failures here are
 * logged but non-fatal so a transient DB hiccup does not crash-loop the app.
 */
async function runMigrations(): Promise<void> {
  if (!env.runMigrationsOnBoot) {
    logger.info('Skipping migrations on boot (RUN_MIGRATIONS_ON_BOOT is false)');
    return;
  }

  logger.info('Applying Prisma migrations (prisma migrate deploy)');
  try {
    const { stdout, stderr } = await execFileAsync('npx', ['prisma', 'migrate', 'deploy'], {
      env: process.env,
      timeout: 120_000,
    });
    if (stdout.trim()) logger.info(`prisma migrate deploy: ${stdout.trim()}`);
    if (stderr.trim()) logger.warn(`prisma migrate deploy stderr: ${stderr.trim()}`);
  } catch (error) {
    logger.error('prisma migrate deploy failed — continuing boot', error);
  }
}

async function bootstrap(): Promise<void> {
  assertProductionSafety();

  logger.info(`Starting ${env.appName} in ${env.nodeEnv} mode`);

  await runMigrations();

  await connectDatabase();
  logger.info('PostgreSQL connection established');

  const app = createApp();
  const server = app.listen(env.port, '0.0.0.0', () => {
    logger.info(`API listening on http://0.0.0.0:${env.port}${env.apiPrefix}`);
  });

  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;

  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal} — shutting down gracefully`);

    server.close(async () => {
      logger.info('HTTP server closed');
      await disconnectDatabase();
      process.exit(0);
    });

    // Hard stop if in-flight requests refuse to drain.
    setTimeout(() => {
      logger.error('Forced shutdown after grace period');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    void shutdown('uncaughtException');
  });
}

bootstrap().catch((error) => {
  logger.error('Fatal boot error', error);
  process.exit(1);
});
