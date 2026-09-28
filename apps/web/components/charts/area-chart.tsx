'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface AreaSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
  /** Render as a filled gradient area (default) or a thin line only. */
  filled?: boolean;
}

interface AreaChartProps {
  labels: string[];
  series: AreaSeries[];
  height?: number;
  valueFormatter?: (value: number) => string;
  yTicks?: number;
}

function buildPath(values: number[], width: number, height: number, max: number, padding: number) {
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const step = values.length > 1 ? usableWidth / (values.length - 1) : usableWidth;

  return values.map((value, index) => {
    const x = padding + index * step;
    const y = padding + usableHeight - (max === 0 ? 0 : (value / max) * usableHeight);
    return { x, y };
  });
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length < 3) return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');

  let path = `M${points[0].x},${points[0].y}`;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const controlX = (previous.x + current.x) / 2;
    path += ` C${controlX},${previous.y} ${controlX},${current.y} ${current.x},${current.y}`;
  }

  return path;
}

/**
 * Dependency-free SVG area/line chart with hover crosshair, multi-series
 * support, and an animated draw-in. Works entirely offline.
 */
export function AreaChart({
  labels,
  series,
  height = 260,
  valueFormatter = (value) => value.toLocaleString('en-US'),
  yTicks = 4,
}: AreaChartProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(Math.max(280, entry.contentRect.width));
    });

    observer.observe(element);
    setWidth(Math.max(280, element.clientWidth));

    return () => observer.disconnect();
  }, []);

  const visibleSeries = useMemo(
    () => series.filter((entry) => !hiddenSeries.includes(entry.key)),
    [series, hiddenSeries],
  );

  const maxValue = useMemo(() => {
    const all = visibleSeries.flatMap((entry) => entry.values);
    const max = all.length > 0 ? Math.max(...all) : 0;
    return max === 0 ? 1 : max * 1.12;
  }, [visibleSeries]);

  const padding = 26;
  const chartHeight = height;
  const steps = Array.from({ length: yTicks + 1 }, (_, index) => (maxValue / yTicks) * index).reverse();

  const handlePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = containerRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const relativeX = event.clientX - rect.left - padding;
    const usableWidth = rect.width - padding * 2;
    const pointCount = Math.max(...visibleSeries.map((entry) => entry.values.length), 1);
    const step = pointCount > 1 ? usableWidth / (pointCount - 1) : usableWidth;
    const index = Math.round(relativeX / step);

    setHoverIndex(Math.max(0, Math.min(pointCount - 1, index)));
  };

  const gradientId = (key: string) => `area-grad-${key.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {series.map((entry) => {
          const hidden = hiddenSeries.includes(entry.key);
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() =>
                setHiddenSeries((current) =>
                  current.includes(entry.key)
                    ? current.filter((key) => key !== entry.key)
                    : [...current, entry.key],
                )
              }
              className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                hidden
                  ? 'border-white/5 bg-transparent text-slate-600'
                  : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: hidden ? '#475569' : entry.color }}
              />
              {entry.label}
            </button>
          );
        })}
      </div>

      <div
        ref={containerRef}
        className="relative w-full touch-none"
        style={{ height: chartHeight }}
        onPointerMove={handlePointer}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${width} ${chartHeight}`} preserveAspectRatio="none" role="img">
          <defs>
            {series.map((entry) => (
              <linearGradient key={entry.key} id={gradientId(entry.key)} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={entry.color} stopOpacity="0.34" />
                <stop offset="100%" stopColor={entry.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          {/* horizontal grid + y axis labels */}
          {steps.map((value, index) => {
            const y = padding + ((chartHeight - padding * 2) / yTicks) * index;
            return (
              <g key={`grid-${index}`}>
                <line
                  x1={padding}
                  x2={width - padding}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 5"
                />
                <text x={4} y={y + 3} fill="#64748b" fontSize="10" fontFamily="ui-monospace, monospace">
                  {valueFormatter(Math.round(value))}
                </text>
              </g>
            );
          })}

          {/* series */}
          {visibleSeries.map((entry) => {
            const points = buildPath(entry.values, width, chartHeight, maxValue, padding);
            const line = smoothPath(points);
            const area = `${line} L${points[points.length - 1]?.x ?? padding},${chartHeight - padding} L${points[0]?.x ?? padding},${chartHeight - padding} Z`;

            return (
              <g key={entry.key}>
                {entry.filled !== false ? <path d={area} fill={`url(#${gradientId(entry.key)})`} /> : null}
                <path
                  d={line}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth={entry.filled === false ? 1.75 : 2.25}
                  strokeLinecap="round"
                  strokeDasharray={entry.filled === false ? '5 4' : undefined}
                />
                {points.length > 0 && points.length <= 32
                  ? points.map((point, index) => (
                      <circle
                        key={`${entry.key}-dot-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={hoverIndex === index ? 4 : 2.4}
                        fill={hoverIndex === index ? entry.color : '#0b1020'}
                        stroke={entry.color}
                        strokeWidth={1.6}
                      />
                    ))
                  : null}
              </g>
            );
          })}

          {/* crosshair */}
          {hoverIndex !== null && visibleSeries[0] && visibleSeries[0].values.length > 1 ? (
            <line
              x1={padding + (hoverIndex * (width - padding * 2)) / (visibleSeries[0].values.length - 1)}
              x2={padding + (hoverIndex * (width - padding * 2)) / (visibleSeries[0].values.length - 1)}
              y1={padding - 6}
              y2={chartHeight - padding}
              stroke="rgba(255,255,255,0.22)"
              strokeDasharray="3 4"
            />
          ) : null}
        </svg>

        {/* tooltip */}
        {hoverIndex !== null && labels[hoverIndex] ? (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-xl border border-white/10 bg-ink-800/95 p-3 shadow-card backdrop-blur"
            style={{
              left: `${Math.min(
                Math.max(8, (hoverIndex / Math.max(1, labels.length - 1)) * width - 70),
                Math.max(8, width - 180),
              )}px`,
            }}
          >
            <p className="mb-2 text-[11px] font-semibold text-slate-300">{labels[hoverIndex]}</p>
            <div className="space-y-1">
              {visibleSeries.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.label}
                  </span>
                  <span className="font-mono font-semibold text-slate-100">
                    {valueFormatter(entry.values[hoverIndex] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* x axis labels */}
      <div className="mt-2 flex justify-between px-1 font-mono text-[10px] text-slate-600">
        {labels
          .filter((_, index) => index % Math.max(1, Math.ceil(labels.length / 7)) === 0)
          .map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
      </div>
    </div>
  );
}

export default AreaChart;
