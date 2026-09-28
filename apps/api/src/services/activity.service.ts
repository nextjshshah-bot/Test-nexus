import type { ActivityAction, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface RecordActivityInput {
  action: ActivityAction;
  message: string;
  userId?: string | null;
  projectId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/** Fire-and-forget audit trail write. Never breaks the caller's request. */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        action: input.action,
        message: input.message,
        userId: input.userId ?? null,
        projectId: input.projectId ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch {
    // Activity logging is best-effort telemetry; swallow failures on purpose.
  }
}

export async function listActivity(params: { userId: string; limit: number; projectId?: string }) {
  const rows = await prisma.activityLog.findMany({
    where: {
      userId: params.userId,
      ...(params.projectId ? { projectId: params.projectId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: params.limit,
    include: {
      project: { select: { id: true, name: true, slug: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    project: row.project ? { id: row.project.id, name: row.project.name, slug: row.project.slug } : null,
    metadata: row.metadata,
  }));
}

export const activityService = { recordActivity, listActivity };
