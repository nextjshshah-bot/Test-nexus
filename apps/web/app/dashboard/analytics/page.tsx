'use client';

import { useMemo, useState } from 'react';
import Topbar from '@/components/layout/topbar';
import KpiCard from '@/components/dashboard/kpi-card';
import RevenueChartCard from '@/components/dashboard/revenue-chart-card';
import { BarChart } from '@/components/charts/bar-chart';
import { Card, SectionHeader, SegmentedControl, Skeleton, DeltaPill } from '@/components/ui/primitives';
import { HorizontalBars } from '@/components/charts/sparkline';
import { useOverview, useTimeseries } from '@/lib/hooks';
import { formatCurrency, formatDuration, formatNumber, formatPercent } from '@/lib/format';
import { PRIORITY_HEX, STATUS_HEX, priorityLabel, statusLabel } from '@/lib/status';
import type { MetricRange } from '@/lib/types';

const FUNNEL_STAGES = [
  { key: 'visits', label: 'Sessions', color: '#608cff' },
  { key: 'signups', label: 'Signups', color: '#34d399' },
  { key: 'conversions', label: 'Conversions', color: '#a78bfa' },
] as const;

export default function AnalyticsPage(): JSX.Element {
  const [range, setRange] = useState<MetricRange>('90d');
  const { data, loading } = useOverview(range);
  const { points, loading: seriesLoading } = useTimeseries(range);

  const churnBars = useMemo(
    () =>
      points.map((point) => ({
        label: point.label,
        value: Number((point.churnRate * 100).toFixed(2)),
        color: '#fb7185',
      })),
    [points],
  );

  const funnel = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Sessions', value: data.totals.visits, color: '#608cff' },
      { label: 'Signups', value: data.totals.signups, color: '#34d399' },
      { label: 'Conversions', value: data.totals.conversions, color: '#a78bfa' },
      { label: 'Churned users', value: data.totals.churnedUsers, color: '#fb7185' },
    ];
  }, [data]);

  const revenueByBucket = useMemo(
    () =>
      points.map((point) => ({
        label: point.label,
        value: point.revenue,
        color: '#608cff',
      })),
    [points],
  );

  return (
    <>
      <Topbar
        title="Analytics"
        subtitle={data ? `Window ${data.periodStart} → ${data.periodEnd} · ${data.range}` : 'Aggregating metrics…'}
        actions={<SegmentedControl options={[{ value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: '90d', label: '90D' }, { value: '12m', label: '12M' }]} value={range} onChange={setRange} size="sm" />}
      />

      <main className="flex-1 space-y-5 px-5 py-6 lg:px-7">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Revenue"
            value={data ? formatCurrency(data.totals.revenue, { compact: true }) : '$0'}
            delta={data?.deltas.revenue}
            hint={`${formatCurrency(data?.totals.arpu ?? 0)} ARPU`}
            accent="#608cff"
            loading={loading && !data}
          />
          <KpiCard
            label="Conversions"
            value={data ? formatNumber(data.totals.conversions, { compact: true }) : '0'}
            delta={data?.deltas.conversions}
            hint={`${formatPercent(data?.totals.conversionRate ?? 0, 2)} conversion rate`}
            accent="#a78bfa"
            loading={loading && !data}
          />
          <KpiCard
            label="Avg. session"
            value={data ? formatDuration(data.totals.avgSessionSeconds) : '0s'}
            hint="Engagement across all projects"
            accent="#34d399"
            loading={loading && !data}
          />
          <KpiCard
            label="Churn rate"
            value={data ? formatPercent(data.totals.churnRate, 2) : '0%'}
            delta={data?.deltas.churnRate}
            invertDelta
            hint="Share of signups that churned"
            accent="#fb7185"
            loading={loading && !data}
          />
        </section>

        <RevenueChartCard points={points} range={range} onRangeChange={setRange} loading={seriesLoading && points.length === 0} />

        <section className="grid gap-5 xl:grid-cols-2">
          <Card>
            <SectionHeader title="Revenue per bucket" subtitle="Totals grouped into the selected granularity" />
            <BarChart data={revenueByBucket} height={230} valueFormatter={(value) => formatCurrency(value, { compact: true })} accent="#608cff" />
          </Card>

          <Card>
            <SectionHeader title="Churn rate trend" subtitle="Percentage of signups that churned per bucket" />
            <BarChart data={churnBars} height={230} valueFormatter={(value) => `${value.toFixed(2)}%`} accent="#fb7185" />
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <Card>
            <SectionHeader title="Funnel volumes" subtitle="Totals for the selected window" />
            <HorizontalBars data={funnel} valueFormatter={(value) => formatNumber(value, { compact: true })} />
          </Card>

          <Card>
            <SectionHeader title="Status distribution" subtitle="Projects grouped by lifecycle stage" />
            {data ? (
              <HorizontalBars
                data={data.statusBreakdown.map((entry) => ({
                  label: statusLabel(entry.status),
                  value: entry.count,
                  color: STATUS_HEX[entry.status],
                }))}
                valueFormatter={(value) => `${value} projects`}
              />
            ) : (
              <Skeleton className="h-32 w-full" />
            )}
          </Card>

          <Card>
            <SectionHeader title="Priority mix" subtitle="Delivery risk concentration" />
            {data ? (
              <HorizontalBars
                data={data.priorityBreakdown.map((entry) => ({
                  label: priorityLabel(entry.priority),
                  value: entry.count,
                  color: PRIORITY_HEX[entry.priority],
                }))}
                valueFormatter={(value) => `${value} projects`}
              />
            ) : (
              <Skeleton className="h-32 w-full" />
            )}
          </Card>
        </section>

        <Card>
          <SectionHeader title="Period comparison" subtitle="Current window vs the immediately preceding window" />
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[620px] border-separate border-spacing-y-1 px-2">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-600">
                  <th className="px-3 pb-1 font-semibold">Metric</th>
                  <th className="px-3 pb-1 text-right font-semibold">Current</th>
                  <th className="px-3 pb-1 text-right font-semibold">Previous</th>
                  <th className="px-3 pb-1 text-right font-semibold">Change</th>
                </tr>
              </thead>
              <tbody>
                {data
                  ? [
                      { label: 'Sessions', current: data.totals.visits, previous: data.previousTotals.visits, delta: data.deltas.visits, format: (value: number) => formatNumber(value, { compact: true }) },
                      { label: 'Signups', current: data.totals.signups, previous: data.previousTotals.signups, delta: data.deltas.signups, format: (value: number) => formatNumber(value, { compact: true }) },
                      { label: 'Conversions', current: data.totals.conversions, previous: data.previousTotals.conversions, delta: data.deltas.conversions, format: (value: number) => formatNumber(value, { compact: true }) },
                      { label: 'Revenue', current: data.totals.revenue, previous: data.previousTotals.revenue, delta: data.deltas.revenue, format: (value: number) => formatCurrency(value, { compact: true }) },
                      { label: 'Conversion rate', current: data.totals.conversionRate, previous: data.previousTotals.conversionRate, delta: data.deltas.conversionRate, format: (value: number) => formatPercent(value, 2) },
                    ].map((row) => (
                      <tr key={row.label} className="bg-white/[0.02]">
                        <td className="rounded-l-xl px-3 py-2.5 text-xs text-slate-300">{row.label}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold text-slate-100">{row.format(row.current)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-400">{row.format(row.previous)}</td>
                        <td className="rounded-r-xl px-3 py-2.5 text-right">
                          <DeltaPill value={row.delta} />
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </Card>

        <section className="grid gap-3 sm:grid-cols-3">
          {FUNNEL_STAGES.map((stage) => (
            <div key={stage.key} className="rounded-2xl border border-white/[0.06] bg-ink-850/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">{stage.label} → conversion</p>
              <p className="mt-1.5 font-mono text-lg font-semibold" style={{ color: stage.color }}>
                {data && data.totals.visits > 0
                  ? formatPercent(((data.totals[stage.key] as number) / data.totals.visits) * 100, 2)
                  : '0%'}
              </p>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
