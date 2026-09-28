'use client';

import { useMemo, useState } from 'react';
import Topbar from '@/components/layout/topbar';
import KpiCard from '@/components/dashboard/kpi-card';
import RevenueChartCard from '@/components/dashboard/revenue-chart-card';
import StatusBreakdown from '@/components/dashboard/status-breakdown';
import TopProjects from '@/components/dashboard/top-projects';
import ActivityFeed from '@/components/dashboard/activity-feed';
import InsightsPanel from '@/components/dashboard/insights-panel';
import { Card, SectionHeader, Skeleton } from '@/components/ui/primitives';
import { useActivity, useOverview, useProjects } from '@/lib/hooks';
import { formatCurrency, formatDuration, formatNumber, formatPercent } from '@/lib/format';
import type { MetricRange } from '@/lib/types';

const ALL_FILTERS = { search: '', status: 'ALL' as const, priority: 'ALL' as const };

export default function DashboardOverviewPage(): JSX.Element {
  const [range, setRange] = useState<MetricRange>('30d');
  const { data, loading, refetch } = useOverview(range);
  const { entries, loading: activityLoading } = useActivity(8);
  const { stats, projects } = useProjects(ALL_FILTERS, 1, 5, { sortBy: 'budget', sortOrder: 'desc' });

  const revenueTrend = useMemo(() => data?.timeseries.map((point) => point.revenue) ?? [], [data]);
  const visitTrend = useMemo(() => data?.timeseries.map((point) => point.visits) ?? [], [data]);
  const signupTrend = useMemo(() => data?.timeseries.map((point) => point.signups) ?? [], [data]);

  return (
    <>
      <Topbar
        title="Portfolio overview"
        subtitle={
          data
            ? `${data.periodStart} → ${data.periodEnd} · ${projects.length} tracked projects`
            : 'Loading analytics window…'
        }
      />

      <main className="flex-1 space-y-5 px-5 py-6 lg:px-7">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Revenue"
            value={data ? formatCurrency(data.totals.revenue, { compact: true }) : '$0'}
            delta={data?.deltas.revenue}
            hint={`vs ${formatCurrency(data?.previousTotals.revenue ?? 0, { compact: true })} previous`}
            trend={revenueTrend}
            accent="#608cff"
            icon="$"
            loading={loading && !data}
          />
          <KpiCard
            label="Sessions"
            value={data ? formatNumber(data.totals.visits, { compact: true }) : '0'}
            delta={data?.deltas.visits}
            hint={`${data ? formatDuration(data.totals.avgSessionSeconds) : '0s'} average session`}
            trend={visitTrend}
            accent="#34d399"
            icon="◉"
            loading={loading && !data}
          />
          <KpiCard
            label="Signups"
            value={data ? formatNumber(data.totals.signups, { compact: true }) : '0'}
            delta={data?.deltas.signups}
            hint={`${data ? formatCurrency(data.totals.arpu) : '$0'} revenue per signup`}
            trend={signupTrend}
            accent="#a78bfa"
            icon="✦"
            loading={loading && !data}
          />
          <KpiCard
            label="Conversion rate"
            value={data ? formatPercent(data.totals.conversionRate, 2) : '0%'}
            delta={data?.deltas.conversionRate}
            hint={`Churn ${data ? formatPercent(data.totals.churnRate, 2) : '0%'} · lower is better`}
            accent="#fbbf24"
            icon="◔"
            invertDelta
            loading={loading && !data}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <RevenueChartCard points={data?.timeseries ?? []} range={range} onRangeChange={setRange} loading={loading && !data} />

          <div className="space-y-5">
            <InsightsPanel insights={data?.insights ?? []} />

            <Card>
              <SectionHeader title="Delivery health" subtitle="Portfolio-level delivery signals" />
              <dl className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total projects', value: stats ? String(stats.total) : '—' },
                  { label: 'Average progress', value: stats ? `${stats.averageProgress}%` : '—' },
                  { label: 'Overdue', value: stats ? String(stats.overdue) : '—', tone: (stats?.overdue ?? 0) > 0 ? 'text-rose-300' : 'text-slate-100' },
                  { label: 'Due within 7d', value: stats ? String(stats.dueSoon) : '—', tone: (stats?.dueSoon ?? 0) > 0 ? 'text-amber-300' : 'text-slate-100' },
                  { label: 'Committed budget', value: stats ? formatCurrency(stats.totalBudget, { compact: true }) : '—' },
                  { label: 'Completed this month', value: stats ? String(stats.completedThisMonth) : '—', tone: 'text-emerald-300' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <dt className="text-[10px] uppercase tracking-wider text-slate-500">{item.label}</dt>
                    <dd className={`mt-1 font-mono text-lg font-semibold ${item.tone ?? 'text-slate-100'}`}>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <TopProjects projects={data?.topProjects ?? []} />
          <StatusBreakdown
            statusBreakdown={data?.statusBreakdown ?? []}
            priorityBreakdown={data?.priorityBreakdown ?? []}
            totalProjects={stats?.total ?? 0}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
          <ActivityFeed entries={entries} loading={activityLoading} />

          <Card>
            <SectionHeader
              title="Workspace account"
              subtitle="Plan, seat, and usage snapshot"
              action={
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="text-[11px] font-semibold text-nexus-300 transition hover:text-nexus-200"
                >
                  Refresh
                </button>
              }
            />
            <dl className="space-y-3">
              {[
                { label: 'API calls this month', value: data ? formatNumber(data.totals.visits * 3 + 12_400, { compact: true }) : '—' },
                { label: 'Metric buckets in view', value: String(data?.timeseries.length ?? 0) },
                { label: 'Active projects', value: String(data?.statusBreakdown.find((entry) => entry.status === 'ACTIVE')?.count ?? 0) },
                { label: 'Rolled-up budget', value: formatCurrency((data?.statusBreakdown ?? []).reduce((sum, entry) => sum + entry.budget, 0), { compact: true }) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-white/[0.04] pb-2.5 last:border-0 last:pb-0">
                  <dt className="text-xs text-slate-400">{row.label}</dt>
                  <dd className="font-mono text-xs font-semibold text-slate-100">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </section>

        {loading && !data ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-2xl" />
            ))}
          </section>
        ) : null}
      </main>
    </>
  );
}
