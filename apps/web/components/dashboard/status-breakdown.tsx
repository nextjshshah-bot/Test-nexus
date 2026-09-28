'use client';

import { Card, SectionHeader } from '../ui/primitives';
import { DonutChart } from '../charts/donut-chart';
import { HorizontalBars } from '../charts/sparkline';
import { formatCurrency } from '@/lib/format';
import { PRIORITY_HEX, STATUS_HEX, statusLabel, priorityLabel } from '@/lib/status';
import type { Priority, ProjectStatus } from '@/lib/types';

export function StatusBreakdown({
  statusBreakdown,
  priorityBreakdown,
  totalProjects,
}: {
  statusBreakdown: Array<{ status: ProjectStatus; count: number; budget: number }>;
  priorityBreakdown: Array<{ priority: Priority; count: number }>;
  totalProjects: number;
}): JSX.Element {
  const statusSlices = statusBreakdown
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      label: statusLabel(entry.status),
      value: entry.count,
      color: STATUS_HEX[entry.status],
    }));

  const priorityBars = priorityBreakdown.map((entry) => ({
    label: priorityLabel(entry.priority),
    value: entry.count,
    color: PRIORITY_HEX[entry.priority],
  }));

  const totalBudget = statusBreakdown.reduce((sum, entry) => sum + entry.budget, 0);

  return (
    <Card className="h-full">
      <SectionHeader
        title="Portfolio mix"
        subtitle={`${totalProjects} projects · ${formatCurrency(totalBudget, { compact: true })} committed`}
      />

      {totalProjects === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">No projects to break down yet.</p>
      ) : (
        <div className="space-y-6">
          <DonutChart slices={statusSlices} centerLabel="Projects" centerValue={String(totalProjects)} />
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">By priority</p>
            <HorizontalBars data={priorityBars} />
          </div>
        </div>
      )}
    </Card>
  );
}

export default StatusBreakdown;
