export function formatCurrency(value: number, options: { compact?: boolean; currency?: string } = {}): string {
  const { compact = false, currency = 'USD' } = options;

  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatNumber(value: number, options: { compact?: boolean; decimals?: number } = {}): string {
  const { compact = false, decimals } = options;

  return new Intl.NumberFormat('en-US', {
    notation: compact && Math.abs(value) >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: decimals ?? (compact ? 1 : 0),
    minimumFractionDigits: decimals ?? 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value > 0 ? '' : ''}${value.toFixed(decimals)}%`;
}

export function formatDelta(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : value < 0 ? '' : '±';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatDate(value: string | null | undefined, style: 'short' | 'medium' | 'long' = 'medium'): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { month: 'short', day: 'numeric' }
      : style === 'long'
        ? { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' };

  return date.toLocaleDateString('en-US', options);
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return 'never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'never';

  const diffMs = Date.now() - date.getTime();
  const seconds = Math.round(diffMs / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (Math.abs(seconds) < 45) return 'just now';
  if (Math.abs(minutes) < 60) return `${minutes}m ago`;
  if (Math.abs(hours) < 24) return `${hours}h ago`;
  if (Math.abs(days) < 30) return `${days}d ago`;
  if (Math.abs(days) < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

export function formatBytes(megabytes: number): string {
  if (megabytes < 1024) return `${megabytes.toFixed(1)} MB`;
  return `${(megabytes / 1024).toFixed(2)} GB`;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function toInputDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}
