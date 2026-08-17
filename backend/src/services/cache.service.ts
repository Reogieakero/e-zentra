import { redis } from '../lib/redis';

const PREFIX = 'cache:';
const INDEX_KEY = `${PREFIX}index`;

interface MemEntry {
  value: string;
  expires: number;
}

const MEM_TTL_CAP = 60;
const MEM_MAX_ENTRIES = 500;
const memoryCache = new Map<string, MemEntry>();

export function cacheKey(namespace: string, id?: string | number): string {
  return `${PREFIX}${namespace}${id !== undefined ? `:${id}` : ''}`;
}

export async function getCached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem && mem.expires > now) {
    mem.expires = now + Math.min(ttlSeconds, MEM_TTL_CAP) * 1000;
    try {
      return JSON.parse(mem.value) as T;
    } catch {
      memoryCache.delete(key);
    }
  }

  const cached = await redis.get(key);
  if (cached !== null) {
    try {
      setMemory(key, cached, Math.min(ttlSeconds, MEM_TTL_CAP));
      return JSON.parse(cached) as T;
    } catch {
    }
  }

  const value = await loader();
  const serialized = JSON.stringify(value);
  setMemory(key, serialized, Math.min(ttlSeconds, MEM_TTL_CAP));
  await redis.set(key, serialized, 'EX', ttlSeconds);
  await redis.sadd(INDEX_KEY, key);
  return value;
}

function setMemory(key: string, value: string, ttlSeconds: number): void {
  if (memoryCache.size >= MEM_MAX_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

export async function invalidateKeys(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  for (const k of keys) memoryCache.delete(k);
  await redis.del(...keys);
  await redis.srem(INDEX_KEY, ...keys);
}

export async function invalidateByPattern(pattern: string): Promise<void> {
  const fullPattern = pattern.startsWith(PREFIX) ? pattern : `${PREFIX}${pattern}`;
  const keys = await redis.smembers(INDEX_KEY);
  const matches = keys.filter((k) => k.startsWith(fullPattern));
  if (matches.length === 0) return;
  for (const k of matches) memoryCache.delete(k);
  await redis.del(...matches);
  await redis.srem(INDEX_KEY, ...matches);
}
