import type { Priority, ProjectStatus } from './types';

export interface StatusStyle {
  label: string;
  dot: string;
  badge: string;
  ring: string;
}

export const STATUS_STYLES: Record<ProjectStatus, StatusStyle> = {
  PLANNING: {
    label: 'Planning',
    dot: 'bg-sky-400',
    badge: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
    ring: 'ring-sky-500/30',
  },
  ACTIVE: {
    label: 'Active',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    ring: 'ring-emerald-500/30',
  },
  PAUSED: {
    label: 'Paused',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    ring: 'ring-amber-500/30',
  },
  COMPLETED: {
    label: 'Completed',
    dot: 'bg-nexus-400',
    badge: 'bg-nexus-500/10 text-nexus-300 border-nexus-500/25',
    ring: 'ring-nexus-500/30',
  },
  ARCHIVED: {
    label: 'Archived',
    dot: 'bg-slate-500',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
    ring: 'ring-slate-500/30',
  },
};

export interface PriorityStyle {
  label: string;
  badge: string;
  bar: string;
}

export const PRIORITY_STYLES: Record<Priority, PriorityStyle> = {
  LOW: { label: 'Low', badge: 'bg-slate-500/10 text-slate-300 border-slate-500/25', bar: 'bg-slate-400' },
  MEDIUM: { label: 'Medium', badge: 'bg-sky-500/10 text-sky-300 border-sky-500/25', bar: 'bg-sky-400' },
  HIGH: { label: 'High', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/25', bar: 'bg-amber-400' },
  CRITICAL: { label: 'Critical', badge: 'bg-rose-500/10 text-rose-300 border-rose-500/25', bar: 'bg-rose-400' },
};

export const STATUS_ORDER: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'];
export const PRIORITY_ORDER: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const STATUS_HEX: Record<ProjectStatus, string> = {
  PLANNING: '#38bdf8',
  ACTIVE: '#34d399',
  PAUSED: '#fbbf24',
  COMPLETED: '#608cff',
  ARCHIVED: '#64748b',
};

export const PRIORITY_HEX: Record<Priority, string> = {
  LOW: '#94a3b8',
  MEDIUM: '#38bdf8',
  HIGH: '#fbbf24',
  CRITICAL: '#fb7185',
};

export function statusLabel(status: ProjectStatus): string {
  return STATUS_STYLES[status]?.label ?? status;
}

export function priorityLabel(priority: Priority): string {
  return PRIORITY_STYLES[priority]?.label ?? priority;
}

export function progressColor(progress: number): string {
  if (progress >= 85) return 'from-emerald-400 to-emerald-500';
  if (progress >= 55) return 'from-nexus-400 to-nexus-500';
  if (progress >= 25) return 'from-amber-400 to-amber-500';
  return 'from-rose-400 to-rose-500';
}

export function dueDateTone(dueDate: string | null, status: ProjectStatus): { label: string; className: string } {
  if (!dueDate) return { label: 'No due date', className: 'text-slate-500' };
  if (status === 'COMPLETED' || status === 'ARCHIVED') return { label: 'Closed', className: 'text-slate-500' };

  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: 'text-rose-300' };
  if (days === 0) return { label: 'Due today', className: 'text-amber-300' };
  if (days <= 7) return { label: `Due in ${days}d`, className: 'text-amber-300' };
  if (days <= 30) return { label: `Due in ${days}d`, className: 'text-slate-300' };
  return { label: `Due in ${Math.round(days / 30)}mo`, className: 'text-slate-400' };
}
