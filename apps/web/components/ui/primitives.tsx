'use client';

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-nexus-500 text-white hover:bg-nexus-400 focus-visible:outline-nexus-400 shadow-glow disabled:bg-nexus-500/50',
  secondary: 'bg-ink-700 text-slate-100 hover:bg-ink-600 border border-white/10',
  ghost: 'bg-transparent text-slate-300 hover:bg-white/5 hover:text-white',
  danger: 'bg-rose-500/90 text-white hover:bg-rose-500 border border-rose-400/30',
  outline: 'border border-nexus-500/40 text-nexus-200 hover:bg-nexus-500/10',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-5 py-3 text-sm rounded-xl gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? <Spinner className="h-3.5 w-3.5" /> : icon}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Spinner + Skeleton
// ---------------------------------------------------------------------------
export function Spinner({ className = 'h-4 w-4' }: { className?: string }): JSX.Element {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }): JSX.Element {
  return (
    <div className={`relative overflow-hidden rounded-md bg-white/5 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card / Section
// ---------------------------------------------------------------------------
export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}): JSX.Element {
  return (
    <div
      className={`relative rounded-2xl border border-white/[0.06] bg-ink-850/70 shadow-card backdrop-blur-sm ${padded ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
export function Badge({
  children,
  className = '',
  dot,
}: {
  children: ReactNode;
  className?: string;
  dot?: string;
}): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${className}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dot}`} /> : null}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------
export function ProgressBar({
  value,
  gradient = 'from-nexus-400 to-nexus-500',
  className = 'h-1.5',
  showLabel = false,
}: {
  value: number;
  gradient?: string;
  className?: string;
  showLabel?: boolean;
}): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex items-center gap-2">
      <div className={`w-full overflow-hidden rounded-full bg-white/[0.07] ${className}`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-[width] duration-700 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel ? <span className="w-9 shrink-0 text-right text-[11px] font-medium text-slate-400">{clamped}%</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
export function Avatar({
  name,
  size = 'md',
  url,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  url?: string | null;
}): JSX.Element {
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' };
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className={`${sizes[size]} rounded-full object-cover ring-1 ring-white/10`} />
    );
  }

  return (
    <span
      className={`${sizes[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-nexus-500/80 to-violet2-500/70 font-bold text-white ring-1 ring-white/10`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------
export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
}): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-300">
        {label}
        {required ? <span className="text-rose-400">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[11px] font-medium text-rose-300">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

const CONTROL_CLASS =
  'w-full rounded-xl border border-white/10 bg-ink-900/70 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition focus:border-nexus-500/60 focus:outline-none focus:ring-2 focus:ring-nexus-500/25 disabled:opacity-60';

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return <input {...rest} className={`${CONTROL_CLASS} ${className}`} />;
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return <textarea {...rest} className={`${CONTROL_CLASS} min-h-[92px] resize-y ${className}`} />;
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return (
    <select {...rest} className={`${CONTROL_CLASS} cursor-pointer appearance-none pr-9 ${className}`}>
      {children}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Segmented control
// ---------------------------------------------------------------------------
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}): JSX.Element {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-ink-900/60 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg font-semibold transition ${
              size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
            } ${active ? 'bg-nexus-500/90 text-white shadow-glow' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
export function EmptyState({
  title,
  description,
  action,
  icon = '◇',
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: string;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-ink-900/40 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-ink-800 text-lg text-nexus-300">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delta pill (used by KPI cards and tables)
// ---------------------------------------------------------------------------
export function DeltaPill({ value, suffix = '%' }: { value: number; suffix?: string }): JSX.Element {
  const positive = value > 0;
  const neutral = value === 0;
  const tone = neutral
    ? 'border-slate-500/25 bg-slate-500/10 text-slate-300'
    : positive
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
      : 'border-rose-500/25 bg-rose-500/10 text-rose-300';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      <span aria-hidden="true">{neutral ? '→' : positive ? '▲' : '▼'}</span>
      {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  );
}
