import { describe, expect, it } from 'vitest';
import { percentChange, roundTo, toDateOnly, toNumber } from '../src/utils/serialize';
import { slugify } from '../src/utils/slug';
import { buildPaginatedResult, parsePagination } from '../src/utils/pagination';
import { assessPasswordStrength } from '../src/lib/password';

describe('serialize utils', () => {
  it('converts Prisma-like decimals to numbers', () => {
    expect(toNumber({ toString: () => '1234.56' })).toBe(1234.56);
    expect(toNumber(null)).toBe(0);
    expect(toNumber('42')).toBe(42);
  });

  it('rounds predictably', () => {
    expect(roundTo(1.23456, 2)).toBe(1.23);
    expect(roundTo(1.005, 2)).toBe(1.01);
  });

  it('formats date-only strings', () => {
    expect(toDateOnly(new Date('2026-03-08T22:15:00.000Z'))).toBe('2026-03-08');
  });

  it('computes percent change', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(10, 0)).toBe(100);
  });
});

describe('slugify', () => {
  it('produces url-safe slugs', () => {
    expect(slugify('Atlas Checkout Revamp')).toBe('atlas-checkout-revamp');
    expect(slugify('  Cobalt   Billing / Migration  ')).toBe('cobalt-billing-migration');
    expect(slugify('Café Résumé')).toBe('cafe-resume');
  });

  it('falls back when nothing usable remains', () => {
    expect(slugify('!!!')).toBe('project');
  });
});

describe('pagination', () => {
  it('parses and clamps input', () => {
    expect(parsePagination({ page: '3', pageSize: '25' })).toEqual({ page: 3, pageSize: 25, skip: 50, take: 25 });
    expect(parsePagination({ page: '-1', pageSize: '9999' }).pageSize).toBe(100);
    expect(parsePagination({}).page).toBe(1);
  });

  it('builds metadata', () => {
    const result = buildPaginatedResult([1, 2], 25, { page: 2, pageSize: 10, skip: 10, take: 10 });
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.hasNextPage).toBe(true);
    expect(result.meta.hasPreviousPage).toBe(true);
  });
});

describe('password strength', () => {
  it('scores weak passwords low', () => {
    expect(assessPasswordStrength('abc').score).toBeLessThanOrEqual(1);
  });

  it('scores strong passwords high', () => {
    const result = assessPasswordStrength('NexusCore!2026#Strong');
    expect(result.score).toBeGreaterThanOrEqual(4);
    expect(result.suggestions).toHaveLength(0);
  });
});
