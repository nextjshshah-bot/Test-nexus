import type { Request, Response } from 'express';
import * as projectService from '../services/project.service';
import { HttpError } from '../utils/http-error';
import type { CreateProjectInput, ProjectQueryInput, UpdateProjectInput } from '../schemas/project.schema';

export async function listProjects(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  const query = req.query as unknown as ProjectQueryInput;
  const result = await projectService.listProjects(req.user.id, query);

  res.status(200).json({ success: true, data: result.items, meta: result.meta });
}

export async function getProject(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  const project = await projectService.getProjectById(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: project });
}

export async function createProject(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  const project = await projectService.createProject(req.user.id, req.body as CreateProjectInput);
  res.status(201).json({ success: true, data: project });
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  const project = await projectService.updateProject(
    req.user.id,
    req.params.id,
    req.body as UpdateProjectInput,
  );
  res.status(200).json({ success: true, data: project });
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  const deleted = await projectService.deleteProject(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: { id: deleted.id, name: deleted.name, deleted: true } });
}

export async function projectStats(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();

  const stats = await projectService.getProjectStats(req.user.id);
  res.status(200).json({ success: true, data: stats });
}

export const projectController = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  projectStats,
};
