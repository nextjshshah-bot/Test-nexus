import express, { type Express } from 'express';
import { env } from './config/env';
import apiRoutes from './routes';
import { applySecurityMiddleware } from './middleware/security';
import { requestId } from './middleware/request-id';
import { apiRateLimiter } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';

/**
 * Builds the Express application. Exported separately from `index.ts` so the
 * test-suite (and any serverless adapter) can mount it without opening a port.
 */
export function createApp(): Express {
  const app = express();

  applySecurityMiddleware(app);
  app.use(requestId);
  app.use(apiRateLimiter);

  app.use(env.apiPrefix, apiRoutes);

  // Convenience alias so /health works even if API_PREFIX changes.
  app.get('/health', (_req, res) => {
    res.redirect(307, `${env.apiPrefix}/health`);
  });

  app.get('/', (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        name: env.appName,
        status: 'online',
        apiPrefix: env.apiPrefix,
        health: `${env.apiPrefix}/health`,
        environment: env.nodeEnv,
      },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
