import { z } from 'zod';
import { METRIC_RANGES } from '../config/constants';

export const metricsQuerySchema = z.object({
  range: z.enum(METRIC_RANGES).optional().default('30d'),
  projectId: z.string().trim().max(64).optional(),
});

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional().default(8),
  projectId: z.string().trim().max(64).optional(),
});

export type MetricsQueryInput = z.infer<typeof metricsQuerySchema>;
export type ActivityQueryInput = z.infer<typeof activityQuerySchema>;
