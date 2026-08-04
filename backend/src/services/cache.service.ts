import { redis } from '../lib/redis';

const PREFIX = 'cache:';
const INDEX_KEY = `${PREFIX}index`;

export function cacheKey(namespace: string, id?: string | number): string {
  return `${PREFIX}${namespace}${id !== undefined ? `:${id}` : ''}`;
}

export async function getCached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached !== null) {
    try {
      return JSON.parse(cached) as T;
    } catch {
    }
  }
  const value = await loader();
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  await redis.sadd(INDEX_KEY, key);
  return value;
}

export async function invalidateKeys(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await redis.del(...keys);
  await redis.srem(INDEX_KEY, ...keys);
}

export async function invalidateByPattern(pattern: string): Promise<void> {
  const fullPattern = pattern.startsWith(PREFIX) ? pattern : `${PREFIX}${pattern}`;
  const keys = await redis.smembers(INDEX_KEY);
  const matches = keys.filter((k) => k.startsWith(fullPattern));
  if (matches.length === 0) return;
  await redis.del(...matches);
  await redis.srem(INDEX_KEY, ...matches);
}
