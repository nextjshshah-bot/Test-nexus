'use client';

import { useMemo, useState } from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** SVG donut chart with interactive legend (hover highlights a slice). */
export function DonutChart({
  slices,
  size = 190,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}): JSX.Element {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = useMemo(() => slices.reduce((sum, slice) => sum + slice.value, 0), [slices]);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let cursor = 0;
  const arcs = slices.map((slice, index) => {
    const fraction = total === 0 ? 0 : slice.value / total;
    const dash = fraction * circumference;
    const offset = cursor;
    cursor += dash;
    return { ...slice, dash, offset, fraction, index };
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={activeIndex === arc.index ? thickness + 4 : thickness}
              strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
              className="cursor-pointer transition-all duration-200"
              style={{ opacity: activeIndex === null || activeIndex === arc.index ? 1 : 0.35 }}
              onMouseEnter={() => setActiveIndex(arc.index)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-semibold text-slate-100">
            {activeIndex !== null ? slices[activeIndex].value : (centerValue ?? total)}
          </span>
          <span className="mt-0.5 max-w-[92px] text-center text-[10px] uppercase tracking-wider text-slate-500">
            {activeIndex !== null ? slices[activeIndex].label : (centerLabel ?? 'Total')}
          </span>
        </div>
      </div>

      <ul className="min-w-[132px] space-y-2">
        {slices.map((slice, index) => (
          <li
            key={slice.label}
            className="flex cursor-pointer items-center justify-between gap-4 text-xs"
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span className="flex items-center gap-2 text-slate-400">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: slice.color }} />
              {slice.label}
            </span>
            <span className="font-mono font-semibold text-slate-200">
              {total === 0 ? '0%' : `${Math.round((slice.value / total) * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DonutChart;
