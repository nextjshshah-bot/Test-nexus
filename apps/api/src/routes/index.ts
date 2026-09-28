import { Router } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import metricsRoutes from './metrics.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/metrics', metricsRoutes);

router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'NexusCore API',
      version: '1.0.0',
      documentation: {
        health: { method: 'GET', path: '/api/v1/health' },
        register: { method: 'POST', path: '/api/v1/auth/register' },
        login: { method: 'POST', path: '/api/v1/auth/login' },
        refresh: { method: 'POST', path: '/api/v1/auth/refresh' },
        profile: { method: 'GET', path: '/api/v1/auth/me' },
        projects: { method: 'GET', path: '/api/v1/projects' },
        projectCreate: { method: 'POST', path: '/api/v1/projects' },
        projectUpdate: { method: 'PATCH', path: '/api/v1/projects/:id' },
        projectDelete: { method: 'DELETE', path: '/api/v1/projects/:id' },
        metricsOverview: { method: 'GET', path: '/api/v1/metrics/overview?range=30d' },
        metricsTimeseries: { method: 'GET', path: '/api/v1/metrics/timeseries?range=90d' },
        activity: { method: 'GET', path: '/api/v1/metrics/activity?limit=8' },
      },
    },
  });
});

export default router;
