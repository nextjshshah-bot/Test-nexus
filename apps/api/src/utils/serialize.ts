import { Prisma } from '@prisma/client';

/** Safely convert a Prisma Decimal (or number/string/null) into a number. */
export function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return Number(value.toString());
}

export function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toDateOnly(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

/**
 * Decimal rounding that survives binary floating point artefacts.
 * `1.005 * 100` is `100.49999999999999` in IEEE-754, which naive
 * `Math.round` turns into `1` instead of `1.01`. Going through exponential
 * notation sidesteps the multiplication error entirely.
 */
export function roundTo(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const shifted = Number(`${value}e${decimals}`);
  if (Number.isNaN(shifted)) return value;
  return Number(`${Math.round(shifted)}e-${decimals}`);
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return roundTo(((current - previous) / previous) * 100, 1);
}
