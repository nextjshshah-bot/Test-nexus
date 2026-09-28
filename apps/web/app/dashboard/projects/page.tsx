'use client';

import { useCallback, useMemo, useState } from 'react';
import Topbar from '@/components/layout/topbar';
import { Button, Card, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import ProjectFilters, { type FilterState } from '@/components/projects/project-filters';
import ProjectTable, { type SortState } from '@/components/projects/project-table';
import ProjectFormModal from '@/components/projects/project-form-modal';
import DeleteProjectDialog from '@/components/projects/delete-project-dialog';
import { useProjects } from '@/lib/hooks';
import { formatCurrency } from '@/lib/format';
import type { Project } from '@/lib/types';

export default function ProjectsPage(): JSX.Element {
  const { push } = useToast();

  const [filters, setFilters] = useState<FilterState>({ search: '', status: 'ALL', priority: 'ALL' });
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ sortBy: 'createdAt', sortOrder: 'desc' });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const { projects, meta, stats, loading, error, createProject, updateProject, deleteProject } = useProjects(
    filters,
    page,
    10,
    sort,
  );

  const summary = useMemo(
    () => [
      { label: 'Projects', value: stats ? String(stats.total) : '—' },
      { label: 'Committed budget', value: stats ? formatCurrency(stats.totalBudget, { compact: true }) : '—' },
      { label: 'Average progress', value: stats ? `${stats.averageProgress}%` : '—' },
      { label: 'Overdue', value: stats ? String(stats.overdue) : '—' },
      { label: 'Due within 7 days', value: stats ? String(stats.dueSoon) : '—' },
    ],
    [stats],
  );

  const handleSubmit = useCallback(
    async (payload: Record<string, unknown>) => {
      if (editing) {
        await updateProject(editing.id, payload);
        push({ tone: 'success', title: 'Project updated', description: `${payload.name as string} was saved.` });
      } else {
        await createProject(payload);
        push({ tone: 'success', title: 'Project created', description: `${payload.name as string} is now tracked.` });
      }
    },
    [editing, createProject, updateProject, push],
  );

  const handleDelete = useCallback(
    async (project: Project) => {
      try {
        await deleteProject(project.id);
        setDeleting(null);
        push({ tone: 'success', title: 'Project deleted', description: `${project.name} and its metrics were removed.` });
      } catch {
        push({ tone: 'error', title: 'Delete failed', description: 'The project could not be deleted. Please retry.' });
      }
    },
    [deleteProject, push],
  );

  return (
    <>
      <Topbar
        title="Projects"
        subtitle="Create, edit, and retire delivery workstreams"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + New project
          </Button>
        }
      />

      <main className="flex-1 space-y-5 px-5 py-6 lg:px-7">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summary.map((item) => (
            <Card key={item.label} className="py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
              <p className="mt-1.5 font-mono text-xl font-semibold text-slate-100">{item.value}</p>
            </Card>
          ))}
        </section>

        {error ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-xs text-amber-200">
            {error}
          </div>
        ) : null}

        <Card padded={false} className="overflow-hidden">
          <ProjectFilters
            filters={filters}
            total={meta.total}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            onReset={() => {
              setFilters({ search: '', status: 'ALL', priority: 'ALL' });
              setPage(1);
            }}
          />

          <ProjectTable
            projects={projects}
            loading={loading}
            sort={sort}
            onSortChange={setSort}
            onEdit={(project) => {
              setEditing(project);
              setFormOpen(true);
            }}
            onDelete={(project) => setDeleting(project)}
            onCreate={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          />

          {meta.totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3.5">
              <p className="text-[11px] text-slate-500">
                Page {meta.page} of {meta.totalPages} · showing {projects.length} of {meta.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!meta.hasPreviousPage || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  ← Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!meta.hasNextPage || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next →
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        {loading && projects.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : null}
      </main>

      <ProjectFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        project={editing}
      />

      <DeleteProjectDialog
        project={deleting}
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
