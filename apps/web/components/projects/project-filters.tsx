'use client';

import { Button, Input, Select } from '../ui/primitives';
import { PRIORITY_ORDER, STATUS_ORDER } from '@/lib/status';
import { titleCase } from '@/lib/format';
import type { Priority, ProjectStatus } from '@/lib/types';

export interface FilterState {
  search: string;
  status: ProjectStatus | 'ALL';
  priority: Priority | 'ALL';
}

export function ProjectFilters({
  filters,
  onChange,
  onReset,
  total,
}: {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  total: number;
}): JSX.Element {
  const dirty = filters.search !== '' || filters.status !== 'ALL' || filters.priority !== 'ALL';

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-white/[0.06] px-4 py-3.5">
      <div className="relative min-w-[210px] flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">⌕</span>
        <Input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Search name, description, tag…"
          className="pl-8"
          aria-label="Search projects"
        />
      </div>

      <Select
        value={filters.status}
        onChange={(event) => onChange({ ...filters, status: event.target.value as ProjectStatus | 'ALL' })}
        className="w-[152px]"
        aria-label="Filter by status"
      >
        <option value="ALL">All statuses</option>
        {STATUS_ORDER.map((status) => (
          <option key={status} value={status}>
            {titleCase(status)}
          </option>
        ))}
      </Select>

      <Select
        value={filters.priority}
        onChange={(event) => onChange({ ...filters, priority: event.target.value as Priority | 'ALL' })}
        className="w-[148px]"
        aria-label="Filter by priority"
      >
        <option value="ALL">All priorities</option>
        {PRIORITY_ORDER.map((priority) => (
          <option key={priority} value={priority}>
            {titleCase(priority)}
          </option>
        ))}
      </Select>

      <span className="rounded-lg border border-white/[0.07] bg-ink-900/60 px-2.5 py-2 font-mono text-[11px] text-slate-400">
        {total} result{total === 1 ? '' : 's'}
      </span>

      {dirty ? (
        <Button variant="ghost" size="sm" onClick={onReset}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}

export default ProjectFilters;
