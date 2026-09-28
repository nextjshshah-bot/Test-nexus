import type { Request, Response } from 'express';
import * as metricsService from '../services/metrics.service';
import * as activityService from '../services/activity.service';
import { HttpError } from '../utils/http-error';
import type { ActivityQueryInput, MetricsQueryInput } from '../schemas/metrics.schema';

export async function overview(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  const query = req.query as unknown as MetricsQueryInput;
  const data = await metricsService.getOverview(req.user.id, query.range, query.projectId);

  res.status(200).json({ success: true, data });
}

export async function timeseries(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  const query = req.query as unknown as MetricsQueryInput;
  const data = await metricsService.getTimeseries(req.user.id, query.range, query.projectId);

  res.status(200).json({ success: true, data });
}

export async function projectMetrics(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  const query = req.query as unknown as MetricsQueryInput;
  const data = await metricsService.getProjectMetrics(req.user.id, req.params.id, query.range);

  if (!data) throw HttpError.notFound('Project not found.', 'PROJECT_NOT_FOUND');

  res.status(200).json({ success: true, data });
}

export async function activity(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  const query = req.query as unknown as ActivityQueryInput;
  const data = await activityService.listActivity({
    userId: req.user.id,
    limit: query.limit,
    projectId: query.projectId,
  });

  res.status(200).json({ success: true, data });
}

export const metricsController = { overview, timeseries, projectMetrics, activity };
