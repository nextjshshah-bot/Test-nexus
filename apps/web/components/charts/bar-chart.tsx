'use client';

import { useMemo } from 'react';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

/** Vertical bar chart used for signups/conversions comparisons. */
export function BarChart({
  data,
  height = 220,
  valueFormatter = (value: number) => value.toLocaleString('en-US'),
  accent = '#608cff',
}: {
  data: BarDatum[];
  height?: number;
  valueFormatter?: (value: number) => string;
  accent?: string;
}): JSX.Element {
  const max = useMemo(() => {
    const highest = data.reduce((accumulator, entry) => Math.max(accumulator, entry.value), 0);
    return highest === 0 ? 1 : highest;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-xs text-slate-500">
        No data available for this period.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((entry, index) => {
          const ratio = entry.value / max;
          return (
            <div key={`${entry.label}-${index}`} className="group relative flex flex-1 flex-col justify-end">
              <div
                className="w-full rounded-t-[3px] transition-all duration-500 ease-out group-hover:opacity-100"
                style={{
                  height: `${Math.max(2, ratio * (height - 26))}px`,
                  background: `linear-gradient(180deg, ${entry.color ?? accent} 0%, ${entry.color ?? accent}44 100%)`,
                  opacity: 0.88,
                }}
              />
              <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-ink-800/95 px-2 py-1 text-[10px] font-semibold text-slate-100 shadow-card group-hover:block">
                {entry.label}: {valueFormatter(entry.value)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-600">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export default BarChart;
