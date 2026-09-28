import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import * as metricsController from '../controllers/metrics.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import {
  createProjectSchema,
  projectIdParamSchema,
  projectQuerySchema,
  updateProjectSchema,
} from '../schemas/project.schema';
import { metricsQuerySchema } from '../schemas/metrics.schema';

const router = Router();

router.use(authenticate);

router.get('/stats', asyncHandler(projectController.projectStats));

router.get('/', validate({ query: projectQuerySchema }), asyncHandler(projectController.listProjects));
router.post('/', validate({ body: createProjectSchema }), asyncHandler(projectController.createProject));

router.get(
  '/:id',
  validate({ params: projectIdParamSchema }),
  asyncHandler(projectController.getProject),
);
router.patch(
  '/:id',
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  asyncHandler(projectController.updateProject),
);
router.put(
  '/:id',
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  asyncHandler(projectController.updateProject),
);
router.delete(
  '/:id',
  validate({ params: projectIdParamSchema }),
  asyncHandler(projectController.deleteProject),
);
router.get(
  '/:id/metrics',
  validate({ params: projectIdParamSchema, query: metricsQuerySchema }),
  asyncHandler(metricsController.projectMetrics),
);

export default router;
