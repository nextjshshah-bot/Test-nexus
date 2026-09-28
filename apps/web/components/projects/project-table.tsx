'use client';

import Link from 'next/link';
import { Badge, Button, EmptyState, ProgressBar, Skeleton } from '../ui/primitives';
import { Sparkline } from '../charts/sparkline';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { dueDateTone, PRIORITY_STYLES, progressColor, STATUS_STYLES, statusLabel } from '@/lib/status';
import type { Project } from '@/lib/types';

export interface SortState {
  sortBy: 'createdAt' | 'updatedAt' | 'name' | 'budget' | 'progress' | 'dueDate';
  sortOrder: 'asc' | 'desc';
}

export function ProjectTable({
  projects,
  loading,
  sort,
  onSortChange,
  onEdit,
  onDelete,
  onCreate,
}: {
  projects: Project[];
  loading: boolean;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onCreate: () => void;
}): JSX.Element {
  const toggleSort = (field: SortState['sortBy']) => {
    if (sort.sortBy === field) {
      onSortChange({ sortBy: field, sortOrder: sort.sortOrder === 'asc' ? 'desc' : 'asc' });
      return;
    }
    onSortChange({ sortBy: field, sortOrder: 'desc' });
  };

  const SortHeader = ({ field, label, align = 'left' }: { field: SortState['sortBy']; label: string; align?: 'left' | 'right' }) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider transition hover:text-slate-300 ${
        sort.sortBy === field ? 'text-nexus-300' : 'text-slate-600'
      } ${align === 'right' ? 'flex-row-reverse' : ''}`}
    >
      {label}
      <span aria-hidden="true">{sort.sortBy === field ? (sort.sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-2.5 p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon="⬡"
          title="No projects match these filters"
          description="Adjust your search or create a new project to start tracking delivery and revenue."
          action={
            <Button size="sm" onClick={onCreate}>
              Create project
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px]">
        <thead>
          <tr className="border-b border-white/[0.06] text-left text-[10px]">
            <th className="px-4 py-3"><SortHeader field="name" label="Project" /></th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Status</th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Priority</th>
            <th className="px-4 py-3 text-right"><SortHeader field="budget" label="Budget" align="right" /></th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">30d revenue</th>
            <th className="px-4 py-3"><SortHeader field="progress" label="Progress" /></th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Trend</th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Due</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {projects.map((project) => {
            const status = STATUS_STYLES[project.status];
            const priority = PRIORITY_STYLES[project.priority];
            const due = dueDateTone(project.dueDate, project.status);

            return (
              <tr key={project.id} className="group transition hover:bg-white/[0.025]">
                <td className="max-w-[280px] px-4 py-3.5">
                  <Link href={`/dashboard/projects/${project.id}`} className="block min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-100 group-hover:text-white">{project.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {project.description ?? 'No description'}
                    </p>
                    {project.tags.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {project.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </Link>
                </td>
                <td className="px-4 py-3.5">
                  <Badge className={status.badge} dot={status.dot}>
                    {statusLabel(project.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3.5">
                  <Badge className={priority.badge}>{priority.label}</Badge>
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-200">
                  {formatCurrency(project.budget, { compact: true })}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-xs font-semibold text-emerald-300">
                      {formatCurrency(project.metrics?.revenue30d ?? 0, { compact: true })}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {formatNumber(project.metrics?.visits30d ?? 0, { compact: true })} sessions
                    </span>
                  </div>
                </td>
                <td className="w-[140px] px-4 py-3.5">
                  <ProgressBar value={project.progress} gradient={progressColor(project.progress)} showLabel />
                </td>
                <td className="px-4 py-3.5">
                  <Sparkline
                    values={(project.metrics?.visits30d ?? 0) > 0 ? [3, 5, 4, 6, 5, 8, 7, 9, 11, 10, 12, 14] : [1, 1, 1, 1]}
                    color={STATUS_STYLES[project.status].dot === 'bg-emerald-400' ? '#34d399' : '#608cff'}
                    width={54}
                    height={20}
                    filled={false}
                  />
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-[11px] font-medium ${due.className}`}>{due.label}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-600">{formatDate(project.dueDate, 'short')}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-end gap-1.5 opacity-60 transition group-hover:opacity-100">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(project)} aria-label={`Edit ${project.name}`}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-rose-300 hover:bg-rose-500/10" onClick={() => onDelete(project)} aria-label={`Delete ${project.name}`}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ProjectTable;
