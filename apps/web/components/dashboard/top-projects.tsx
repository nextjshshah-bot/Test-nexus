'use client';

import Link from 'next/link';
import { Card, DeltaPill, ProgressBar, SectionHeader } from '../ui/primitives';
import { Sparkline } from '../charts/sparkline';
import { formatCurrency, formatNumber } from '@/lib/format';
import { progressColor, STATUS_STYLES } from '@/lib/status';
import type { OverviewResponse } from '@/lib/types';

export function TopProjects({ projects }: { projects: OverviewResponse['topProjects'] }): JSX.Element {
  return (
    <Card>
      <SectionHeader
        title="Top performers"
        subtitle="Ranked by revenue in the selected window"
        action={
          <Link href="/dashboard/projects" className="text-[11px] font-semibold text-nexus-300 transition hover:text-nexus-200">
            All projects →
          </Link>
        }
      />

      {projects.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">No revenue recorded yet for this period.</p>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[620px] border-separate border-spacing-y-1.5 px-2">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-600">
                <th className="px-2 pb-1 font-semibold">Project</th>
                <th className="px-2 pb-1 text-right font-semibold">Revenue</th>
                <th className="px-2 pb-1 text-right font-semibold">Sessions</th>
                <th className="px-2 pb-1 text-right font-semibold">Conv.</th>
                <th className="px-2 pb-1 font-semibold">Trend</th>
                <th className="px-2 pb-1 font-semibold">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const status = STATUS_STYLES[project.status];
                return (
                  <tr key={project.id} className="group rounded-xl bg-white/[0.02] transition hover:bg-white/[0.05]">
                    <td className="rounded-l-xl px-2 py-2.5">
                      <Link href={`/dashboard/projects/${project.id}`} className="flex items-center gap-2.5">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-200 group-hover:text-white">
                            {project.name}
                          </span>
                          <span className="block text-[10px] text-slate-500">{status.label}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-xs font-semibold text-slate-100">
                      {formatCurrency(project.revenue, { compact: true })}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-xs text-slate-300">
                      {formatNumber(project.visits, { compact: true })}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-xs text-slate-300">
                      {project.conversionRate.toFixed(2)}%
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkline
                          values={project.trend}
                          color={project.trendDelta >= 0 ? '#34d399' : '#fb7185'}
                          width={64}
                          height={20}
                          filled={false}
                        />
                        <DeltaPill value={project.trendDelta} />
                      </div>
                    </td>
                    <td className="w-[130px] rounded-r-xl px-2 py-2.5">
                      <ProgressBar value={project.progress} gradient={progressColor(project.progress)} showLabel />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default TopProjects;
