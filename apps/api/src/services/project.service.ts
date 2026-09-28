import { Prisma, type ProjectStatus, type Priority } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { HttpError } from '../utils/http-error';
import { buildPaginatedResult, parsePagination, type PaginatedResult } from '../utils/pagination';
import { roundTo, toDateOnly, toIso, toNumber } from '../utils/serialize';
import { slugify, uniqueSuffix } from '../utils/slug';
import { recordActivity } from './activity.service';
import type { CreateProjectInput, ProjectQueryInput, UpdateProjectInput } from '../schemas/project.schema';

export interface ProjectDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority;
  budget: number;
  progress: number;
  tags: string[];
  startDate: string | null;
  dueDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; email: string };
  metrics?: ProjectMetricsSummary;
}

export interface ProjectMetricsSummary {
  visits30d: number;
  signups30d: number;
  revenue30d: number;
  conversionRate30d: number;
  lastActivityDate: string | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  const date = new Date(Date.now() - days * MS_PER_DAY);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function generateUniqueSlug(ownerId: string, name: string, ignoreProjectId?: string): Promise<string> {
  const base = slugify(name);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${uniqueSuffix(4)}`;

    const clash = await prisma.project.findFirst({
      where: {
        ownerId,
        slug: candidate,
        ...(ignoreProjectId ? { NOT: { id: ignoreProjectId } } : {}),
      },
      select: { id: true },
    });

    if (!clash) return candidate;
  }

  return `${base}-${uniqueSuffix(8)}`;
}

function serializeProject(
  project: Prisma.ProjectGetPayload<{ include: { owner: { select: { id: true; name: true; email: true } } } }>,
  metrics?: ProjectMetricsSummary,
): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    status: project.status,
    priority: project.priority,
    budget: toNumber(project.budget),
    progress: project.progress,
    tags: project.tags,
    startDate: project.startDate ? toDateOnly(project.startDate) : null,
    dueDate: project.dueDate ? toDateOnly(project.dueDate) : null,
    archivedAt: toIso(project.archivedAt),
    createdAt: toIso(project.createdAt) as string,
    updatedAt: toIso(project.updatedAt) as string,
    owner: { id: project.owner.id, name: project.owner.name, email: project.owner.email },
    ...(metrics ? { metrics } : {}),
  };
}

async function summariseProjectMetrics(projectIds: string[]): Promise<Map<string, ProjectMetricsSummary>> {
  const summary = new Map<string, ProjectMetricsSummary>();
  if (projectIds.length === 0) return summary;

  const rows = await prisma.dailyMetric.groupBy({
    by: ['projectId'],
    where: { projectId: { in: projectIds }, date: { gte: daysAgo(30) } },
    _sum: { visits: true, signups: true, conversions: true, revenue: true },
    _max: { date: true },
  });

  for (const row of rows) {
    const visits = row._sum.visits ?? 0;
    const signups = row._sum.signups ?? 0;
    const conversions = row._sum.conversions ?? 0;

    summary.set(row.projectId, {
      visits30d: visits,
      signups30d: signups,
      revenue30d: roundTo(toNumber(row._sum.revenue), 2),
      conversionRate30d: roundTo(visits === 0 ? 0 : (conversions / visits) * 100, 2),
      lastActivityDate: row._max.date ? toDateOnly(row._max.date) : null,
    });
  }

  return summary;
}

export async function listProjects(
  ownerId: string,
  query: ProjectQueryInput,
): Promise<PaginatedResult<ProjectDto>> {
  const pagination = parsePagination({ page: query.page, pageSize: query.pageSize });

  const where: Prisma.ProjectWhereInput = {
    ownerId,
    ...(query.status && query.status !== 'ALL' ? { status: query.status } : {}),
    ...(query.priority && query.priority !== 'ALL' ? { priority: query.priority } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { tags: { has: query.search } },
          ],
        }
      : {}),
  };

  const [total, projects] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  const metrics = await summariseProjectMetrics(projects.map((project) => project.id));

  return buildPaginatedResult(
    projects.map((project) => serializeProject(project, metrics.get(project.id))),
    total,
    pagination,
  );
}

export async function getProjectById(ownerId: string, projectId: string): Promise<ProjectDto> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  if (!project) throw HttpError.notFound('Project not found.', 'PROJECT_NOT_FOUND');

  const metrics = await summariseProjectMetrics([project.id]);
  return serializeProject(project, metrics.get(project.id));
}

export async function createProject(ownerId: string, input: CreateProjectInput): Promise<ProjectDto> {
  const slug = await generateUniqueSlug(ownerId, input.name);

  const project = await prisma.project.create({
    data: {
      name: input.name,
      slug,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      ownerId,
      budget: new Prisma.Decimal(input.budget ?? 0),
      progress: input.progress ?? 0,
      tags: input.tags ?? [],
      startDate: input.startDate ?? new Date(),
      dueDate: input.dueDate ?? null,
    },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  await recordActivity({
    action: 'PROJECT_CREATED',
    userId: ownerId,
    projectId: project.id,
    message: `Project "${project.name}" was created`,
    metadata: { status: project.status, priority: project.priority },
  });

  return serializeProject(project);
}

export async function updateProject(
  ownerId: string,
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectDto> {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, ownerId },
    select: { id: true, name: true, status: true },
  });

  if (!existing) throw HttpError.notFound('Project not found.', 'PROJECT_NOT_FOUND');

  const data: Prisma.ProjectUpdateInput = {};

  if (input.name !== undefined && input.name !== existing.name) {
    data.name = input.name;
    data.slug = await generateUniqueSlug(ownerId, input.name, projectId);
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) {
    data.status = input.status;
    data.archivedAt = input.status === 'ARCHIVED' ? new Date() : null;
  }
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.budget !== undefined) data.budget = new Prisma.Decimal(input.budget);
  if (input.progress !== undefined) data.progress = input.progress;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.startDate !== undefined) data.startDate = input.startDate;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;

  const project = await prisma.project.update({
    where: { id: projectId },
    data,
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  if (input.status !== undefined && input.status !== existing.status) {
    await recordActivity({
      action: 'PROJECT_STATUS_CHANGED',
      userId: ownerId,
      projectId: project.id,
      message: `"${project.name}" moved from ${existing.status} to ${input.status}`,
      metadata: { from: existing.status, to: input.status },
    });
  } else {
    await recordActivity({
      action: 'PROJECT_UPDATED',
      userId: ownerId,
      projectId: project.id,
      message: `Project "${project.name}" was updated`,
      metadata: { fields: Object.keys(input) },
    });
  }

  const metrics = await summariseProjectMetrics([project.id]);
  return serializeProject(project, metrics.get(project.id));
}

export async function deleteProject(ownerId: string, projectId: string): Promise<{ id: string; name: string }> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId },
    select: { id: true, name: true },
  });

  if (!project) throw HttpError.notFound('Project not found.', 'PROJECT_NOT_FOUND');

  await prisma.project.delete({ where: { id: projectId } });

  await recordActivity({
    action: 'PROJECT_DELETED',
    userId: ownerId,
    message: `Project "${project.name}" was deleted`,
    metadata: { projectId: project.id, name: project.name },
  });

  return project;
}

export interface ProjectStats {
  total: number;
  byStatus: Record<ProjectStatus, number>;
  byPriority: Record<Priority, number>;
  totalBudget: number;
  averageProgress: number;
  overdue: number;
  dueSoon: number;
  completedThisMonth: number;
}

export async function getProjectStats(ownerId: string): Promise<ProjectStats> {
  const [statusGroups, priorityGroups, aggregate, projects] = await Promise.all([
    prisma.project.groupBy({ by: ['status'], where: { ownerId }, _count: { _all: true } }),
    prisma.project.groupBy({ by: ['priority'], where: { ownerId }, _count: { _all: true } }),
    prisma.project.aggregate({ where: { ownerId }, _sum: { budget: true }, _avg: { progress: true }, _count: { _all: true } }),
    prisma.project.findMany({ where: { ownerId }, select: { dueDate: true, status: true, createdAt: true } }),
  ]);

  const byStatus: Record<ProjectStatus, number> = {
    PLANNING: 0,
    ACTIVE: 0,
    PAUSED: 0,
    COMPLETED: 0,
    ARCHIVED: 0,
  };
  const byPriority: Record<Priority, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

  for (const group of statusGroups) byStatus[group.status] = group._count._all;
  for (const group of priorityGroups) byPriority[group.priority] = group._count._all;

  const now = Date.now();
  const weekAhead = now + 7 * MS_PER_DAY;

  const overdue = projects.filter(
    (project) =>
      project.dueDate !== null &&
      project.dueDate.getTime() < now &&
      !['COMPLETED', 'ARCHIVED'].includes(project.status),
  ).length;

  const dueSoon = projects.filter(
    (project) =>
      project.dueDate !== null &&
      project.dueDate.getTime() >= now &&
      project.dueDate.getTime() <= weekAhead &&
      !['COMPLETED', 'ARCHIVED'].includes(project.status),
  ).length;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const completedThisMonth = await prisma.project.count({
    where: { ownerId, status: 'COMPLETED', updatedAt: { gte: monthStart } },
  });

  return {
    total: aggregate._count._all,
    byStatus,
    byPriority,
    totalBudget: roundTo(toNumber(aggregate._sum.budget), 2),
    averageProgress: roundTo(aggregate._avg.progress ?? 0, 1),
    overdue,
    dueSoon,
    completedThisMonth,
  };
}

export const projectService = {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectStats,
};
