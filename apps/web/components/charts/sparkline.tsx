'use client';

/** Tiny inline trend line for table rows and KPI cards. */
export function Sparkline({
  values,
  color = '#608cff',
  width = 96,
  height = 30,
  filled = true,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  filled?: boolean;
}): JSX.Element {
  if (values.length === 0) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min === 0 ? 1 : max - min;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((value, index) => ({
    x: index * step,
    y: height - ((value - min) / range) * (height - 6) - 3,
  }));

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const gradientId = `spark-${color.replace('#', '')}-${filled ? 'f' : 'l'}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {filled ? <path d={area} fill={`url(#${gradientId})`} /> : null}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {points.length > 0 ? (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.2" fill={color} />
      ) : null}
    </svg>
  );
}

/** Horizontal ranked bars — used for priority/status distributions. */
export function HorizontalBars({
  data,
  valueFormatter = (value: number) => String(value),
}: {
  data: Array<{ label: string; value: number; color: string }>;
  valueFormatter?: (value: number) => string;
}): JSX.Element {
  const max = Math.max(...data.map((entry) => entry.value), 1);

  return (
    <ul className="space-y-3">
      {data.map((entry) => (
        <li key={entry.label}>
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2 text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.label}
            </span>
            <span className="font-mono font-semibold text-slate-200">{valueFormatter(entry.value)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${(entry.value / max) * 100}%`, backgroundColor: entry.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default Sparkline;
