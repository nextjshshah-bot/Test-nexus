'use client';

import { useMemo, useState } from 'react';
import { AreaChart, type AreaSeries } from '../charts/area-chart';
import { SegmentedControl } from '../ui/primitives';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { MetricRange, TimeseriesPoint } from '@/lib/types';

type MetricKey = 'revenue' | 'visits' | 'signups';

const METRIC_OPTIONS: Array<{ value: MetricKey; label: string }> = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'visits', label: 'Traffic' },
  { value: 'signups', label: 'Signups' },
];

const RANGE_OPTIONS: Array<{ value: MetricRange; label: string }> = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '12m', label: '12M' },
];

export function RevenueChartCard({
  points,
  range,
  onRangeChange,
  loading = false,
}: {
  points: TimeseriesPoint[];
  range: MetricRange;
  onRangeChange: (range: MetricRange) => void;
  loading?: boolean;
}): JSX.Element {
  const [metric, setMetric] = useState<MetricKey>('revenue');
  const [compare, setCompare] = useState(false);

  const labels = useMemo(() => points.map((point) => point.label), [points]);

  const series = useMemo<AreaSeries[]>(() => {
    const primary: AreaSeries =
      metric === 'revenue'
        ? { key: 'revenue', label: 'Revenue', color: '#608cff', values: points.map((point) => point.revenue) }
        : metric === 'visits'
          ? { key: 'visits', label: 'Sessions', color: '#34d399', values: points.map((point) => point.visits) }
          : { key: 'signups', label: 'Signups', color: '#a78bfa', values: points.map((point) => point.signups) };

    const output: AreaSeries[] = [primary];

    if (compare) {
      output.push({
        key: 'conversions',
        label: 'Conversions',
        color: '#fbbf24',
        values: points.map((point) => point.conversions),
        filled: false,
      });
    }

    return output;
  }, [metric, points, compare]);

  const valueFormatter = metric === 'revenue' ? (value: number) => formatCurrency(value, { compact: true }) : (value: number) => formatNumber(value, { compact: true });

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-ink-850/70 p-5 shadow-card backdrop-blur-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">Performance over time</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {points.length} buckets · {range === '12m' ? 'monthly' : range === '90d' ? 'weekly' : 'daily'} granularity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl options={METRIC_OPTIONS} value={metric} onChange={setMetric} size="sm" />
          <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={onRangeChange} size="sm" />
          <button
            type="button"
            onClick={() => setCompare((current) => !current)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              compare
                ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
                : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
            }`}
          >
            Compare conversions
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[260px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-nexus-400" />
        </div>
      ) : points.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-xs text-slate-500">
          No metric rows for this range yet.
        </div>
      ) : (
        <AreaChart labels={labels} series={series} height={260} valueFormatter={valueFormatter} />
      )}
    </div>
  );
}

export default RevenueChartCard;
