'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError, tokenStore } from './api-client';
import { demoData, demoOverview } from './demo-data';
import { useAuth } from './auth-context';
import type {
  ActivityEntry,
  MetricRange,
  OverviewResponse,
  Project,
  ProjectListParams,
  ProjectStats,
  TimeseriesPoint,
} from './types';
import type { FilterState } from '@/components/projects/project-filters';

/* ------------------------------------------------------------------ */
/* Overview / analytics                                                */
/* ------------------------------------------------------------------ */
export function useOverview(range: MetricRange = '30d', projectId?: string) {
  const { mode } = useAuth();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (mode === 'demo') {
      setData(demoOverview(range));
      setLoading(false);
      return;
    }

    try {
      setData(await api.metrics.overview(range, projectId));
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        if (caught.code === 'NETWORK_ERROR') setData(demoOverview(range));
      } else {
        setError('Unable to load metrics.');
      }
    } finally {
      setLoading(false);
    }
  }, [mode, range, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refetch = useCallback(async () => {
    if (mode === 'demo') {
      setData(demoOverview(range));
      return;
    }
    try {
      setData(await api.metrics.overview(range, projectId));
    } catch {
      /* keep previous snapshot */
    }
  }, [mode, range, projectId]);

  return { data, loading, error, refetch, setData };
}

export function useTimeseries(range: MetricRange = '90d', projectId?: string) {
  const { mode } = useAuth();
  const [points, setPoints] = useState<TimeseriesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        if (mode === 'demo') {
          if (!cancelled) setPoints(demoOverview(range).timeseries);
          return;
        }
        const result = await api.metrics.timeseries(range, projectId);
        if (!cancelled) setPoints(result.points);
      } catch {
        if (!cancelled) setPoints(demoOverview(range).timeseries);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [mode, range, projectId]);

  return { points, loading };
}

export function useActivity(limit = 8) {
  const { mode } = useAuth();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'demo') {
        setEntries(demoData.activity().slice(0, limit));
        return;
      }
      setEntries(await api.metrics.activity(limit));
    } catch {
      setEntries(demoData.activity().slice(0, limit));
    } finally {
      setLoading(false);
    }
  }, [mode, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { entries, loading, refetch: load };
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */
export interface UseProjectsResult {
  projects: Project[];
  meta: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
  stats: ProjectStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProject: (payload: Record<string, unknown>) => Promise<Project>;
  updateProject: (id: string, payload: Record<string, unknown>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

const DEFAULT_META = { page: 1, pageSize: 10, total: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false };

export function useProjects(filters: FilterState, page: number, pageSize = 10, sort?: Partial<ProjectListParams>): UseProjectsResult {
  const { mode } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [meta, setMeta] = useState(DEFAULT_META);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoOverrides, setDemoOverrides] = useState<Project[]>([]);

  const demoSource = useMemo(() => {
    const base = [...demoOverrides, ...demoData.projects.filter((project) => !demoOverrides.some((override) => override.id === project.id))];
    const query = filters.search.trim().toLowerCase();

    return base.filter((project) => {
      if (filters.status !== 'ALL' && project.status !== filters.status) return false;
      if (filters.priority !== 'ALL' && project.priority !== filters.priority) return false;
      if (query.length === 0) return true;
      return (
        project.name.toLowerCase().includes(query) ||
        (project.description ?? '').toLowerCase().includes(query) ||
        project.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [demoOverrides, filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (mode === 'demo') {
      const start = (page - 1) * pageSize;
      setProjects(demoSource.slice(start, start + pageSize));
      setMeta({
        page,
        pageSize,
        total: demoSource.length,
        totalPages: Math.max(1, Math.ceil(demoSource.length / pageSize)),
        hasNextPage: page * pageSize < demoSource.length,
        hasPreviousPage: page > 1,
      });
      setStats({
        ...demoData.projectStats(),
        total: demoSource.length,
      });
      setLoading(false);
      return;
    }

    try {
      const [list, projectStats] = await Promise.all([
        api.projects.list({ page, pageSize, ...filters, ...sort }),
        api.projects.stats(),
      ]);
      setProjects(list.items);
      setMeta(list.meta);
      setStats(projectStats);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        if (caught.code === 'NETWORK_ERROR') {
          setProjects(demoData.projects.slice(0, pageSize));
          setMeta({ ...DEFAULT_META, total: demoData.projects.length, pageSize });
          setStats(demoData.projectStats());
        }
      } else {
        setError('Unable to load projects.');
      }
    } finally {
      setLoading(false);
    }
  }, [mode, page, pageSize, filters, sort, demoSource]);

  useEffect(() => {
    void load();
  }, [load]);

  const createProject = useCallback(
    async (payload: Record<string, unknown>): Promise<Project> => {
      if (mode === 'demo' || !tokenStore.getAccess()) {
        const created = {
          ...demoData.projects[0],
          id: `prj_demo_${Date.now()}`,
          owner: demoData.user
            ? { id: demoData.user.id, name: demoData.user.name, email: demoData.user.email }
            : demoData.projects[0].owner,
          name: String(payload.name ?? 'Untitled project'),
          slug: String(payload.name ?? 'untitled-project').toLowerCase().replace(/\s+/g, '-'),
          description: (payload.description as string | null) ?? null,
          status: (payload.status as Project['status']) ?? 'PLANNING',
          priority: (payload.priority as Project['priority']) ?? 'MEDIUM',
          budget: Number(payload.budget ?? 0),
          progress: Number(payload.progress ?? 0),
          tags: (payload.tags as string[]) ?? [],
          startDate: (payload.startDate as string | null) ?? null,
          dueDate: (payload.dueDate as string | null) ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Project;

        setDemoOverrides((current) => [created, ...current]);
        return created;
      }

      const created = await api.projects.create(payload);
      await load();
      return created;
    },
    [mode, load],
  );

  const updateProject = useCallback(
    async (id: string, payload: Record<string, unknown>): Promise<Project> => {
      if (mode === 'demo' || !tokenStore.getAccess()) {
        const existing = demoData.projects.find((project) => project.id === id) ?? demoData.projects[0];
        const updated = { ...existing, ...payload, id, updatedAt: new Date().toISOString() } as Project;
        setDemoOverrides((current) => [updated, ...current.filter((project) => project.id !== id)]);
        return updated;
      }

      const updated = await api.projects.update(id, payload);
      await load();
      return updated;
    },
    [mode, load],
  );

  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      if (mode === 'demo' || !tokenStore.getAccess()) {
        setDemoOverrides((current) => [...current.filter((project) => project.id !== id)]);
        setProjects((current) => current.filter((project) => project.id !== id));
        return;
      }

      await api.projects.remove(id);
      await load();
    },
    [mode, load],
  );

  return { projects, meta, stats, loading, error, refetch: load, createProject, updateProject, deleteProject };
}

/* ------------------------------------------------------------------ */
/* Single project                                                      */
/* ------------------------------------------------------------------ */
export function useProject(id: string) {
  const { mode } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [metrics, setMetrics] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      const demoProject = demoData.projects.find((entry) => entry.id === id) ?? null;

      if (mode === 'demo' || !tokenStore.getAccess()) {
        if (!cancelled) {
          setProject(demoProject);
          setMetrics(demoOverview('30d'));
          setLoading(false);
        }
        return;
      }

      try {
        const [projectData, metricsData] = await Promise.all([
          api.projects.get(id),
          api.metrics.overview('30d', id),
        ]);
        if (!cancelled) {
          setProject(projectData);
          setMetrics(metricsData);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : 'Unable to load this project.');
          setProject(demoProject);
          setMetrics(demoOverview('30d'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [id, mode]);

  return { project, metrics, loading, error, setProject };
}

export const hooks = { useOverview, useTimeseries, useActivity, useProjects, useProject };
