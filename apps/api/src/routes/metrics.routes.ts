import { Router } from 'express';
import * as metricsController from '../controllers/metrics.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { activityQuerySchema, metricsQuerySchema } from '../schemas/metrics.schema';

const router = Router();

router.use(authenticate);

router.get('/overview', validate({ query: metricsQuerySchema }), asyncHandler(metricsController.overview));
router.get('/timeseries', validate({ query: metricsQuerySchema }), asyncHandler(metricsController.timeseries));
router.get('/activity', validate({ query: activityQuerySchema }), asyncHandler(metricsController.activity));

export default router;
