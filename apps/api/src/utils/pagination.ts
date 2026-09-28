import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../config/constants';

export interface PaginationInput {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function parsePagination(query: Record<string, unknown>): PaginationInput {
  const page = toPositiveInt(query.page, 1);
  const requestedSize = toPositiveInt(query.pageSize ?? query.limit, DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(requestedSize, MAX_PAGE_SIZE);

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPaginatedResult<T>(items: T[], total: number, input: PaginationInput): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));

  return {
    items,
    meta: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages,
      hasNextPage: input.page < totalPages,
      hasPreviousPage: input.page > 1,
    },
  };
}

export const paginationHelpers = { parsePagination, buildPaginatedResult };
