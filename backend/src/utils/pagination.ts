export interface OffsetQuery {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface CursorQuery {
  take: number;
  cursor?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function parseOffsetPagination(query: Record<string, unknown>): OffsetQuery {
  const rawPage = Number(query.page ?? 1);
  const rawPageSize = Number(query.pageSize ?? 20);
  const page = clamp(Number.isFinite(rawPage) ? Math.floor(rawPage) : 1, 1, 100000);
  const pageSize = clamp(Number.isFinite(rawPageSize) ? Math.floor(rawPageSize) : 20, 1, 100);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export interface OffsetResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export function buildOffsetResult<T>(data: T[], total: number, query: OffsetQuery): OffsetResult<T> {
  return {
    data,
    page: query.page,
    pageSize: query.pageSize,
    total,
    hasMore: query.page * query.pageSize < total,
  };
}

export function parseCursorPagination(query: Record<string, unknown>): CursorQuery {
  const rawTake = Number(query.limit ?? 20);
  const take = clamp(Number.isFinite(rawTake) ? Math.floor(rawTake) : 20, 1, 100);
  const cursor = typeof query.cursor === 'string' && query.cursor.length > 0 ? query.cursor : undefined;
  return { take, cursor };
}

export interface CursorResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function buildCursorResult<T>(data: T[], query: CursorQuery): CursorResult<T> {
  const hasMore = data.length > query.take;
  const items = hasMore ? data.slice(0, query.take) : data;
  const last = items[items.length - 1] as { id?: string } | undefined;
  return {
    data: items,
    nextCursor: hasMore && last?.id ? last.id : null,
    hasMore,
  };
}
