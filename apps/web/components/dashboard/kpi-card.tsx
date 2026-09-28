'use client';

import { Card, DeltaPill, Skeleton } from '../ui/primitives';
import { Sparkline } from '../charts/sparkline';

export interface KpiCardProps {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  trend?: number[];
  accent?: string;
  icon?: string;
  loading?: boolean;
  /** Set true when a lower value is the desirable outcome (e.g. churn). */
  invertDelta?: boolean;
}

export function KpiCard({
  label,
  value,
  delta,
  hint,
  trend,
  accent = '#608cff',
  icon,
  loading = false,
  invertDelta = false,
}: KpiCardProps): JSX.Element {
  if (loading) {
    return (
      <Card>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-4 h-7 w-28" />
        <Skeleton className="mt-4 h-8 w-full" />
      </Card>
    );
  }

  const effectiveDelta = delta === undefined ? undefined : invertDelta ? -delta : delta;

  return (
    <Card className="group overflow-hidden transition duration-200 hover:border-white/[0.12]">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full opacity-[0.14] blur-2xl transition group-hover:opacity-25"
        style={{ backgroundColor: accent }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon ? (
              <span
                className="flex h-6 w-6 items-center justify-center rounded-lg text-[11px]"
                style={{ backgroundColor: `${accent}1f`, color: accent }}
              >
                {icon}
              </span>
            ) : null}
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          </div>
          <p className="mt-2.5 font-mono text-[26px] font-semibold leading-none tracking-tight text-slate-50">{value}</p>
        </div>
        {effectiveDelta !== undefined ? <DeltaPill value={effectiveDelta} /> : null}
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <p className="text-[11px] leading-snug text-slate-500">{hint ?? 'vs previous period'}</p>
        {trend && trend.length > 1 ? <Sparkline values={trend} color={accent} width={84} height={26} /> : null}
      </div>
    </Card>
  );
}

export default KpiCard;
