import { NextFunction, Request, Response } from 'express';
import { redis } from '../lib/redis';
import { ApiError } from '../utils/ApiError';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

export function redisRateLimit({ windowMs, max, keyPrefix }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${keyPrefix}:${req.ip ?? 'unknown'}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      if (count > max) {
        const ttl = await redis.pttl(key);
        res.setHeader('Retry-After', Math.max(1, Math.ceil(ttl / 1000)));
        return next(ApiError.rateLimited());
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export interface LoginLockoutResult {
  attempts: number;
  locked: boolean;
  retryAfterSeconds: number;
}

export async function recordLoginFailure(userId: string, maxAttempts: number, lockoutMs: number): Promise<LoginLockoutResult> {
  const windowMs = Math.max(lockoutMs, 60000);
  const attemptsKey = `auth:failures:${userId}`;
  const lockKey = `auth:locked:${userId}`;
  const attempts = await redis.incr(attemptsKey);
  if (attempts === 1) {
    await redis.pexpire(attemptsKey, windowMs);
  }
  const locked = attempts >= maxAttempts;
  if (locked && (await redis.exists(lockKey)) === 0) {
    await redis.set(lockKey, '1', 'PX', lockoutMs);
  }
  const ttl = locked ? await redis.pttl(lockKey) : 0;
  return { attempts, locked, retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)) };
}

export async function resetLoginFailures(userId: string): Promise<void> {
  await redis.del(`auth:failures:${userId}`, `auth:locked:${userId}`);
}

export async function isLoginLockedOut(userId: string): Promise<{ locked: boolean; retryAfterSeconds: number }> {
  const ttl = await redis.pttl(`auth:locked:${userId}`);
  if (ttl > 0) {
    return { locked: true, retryAfterSeconds: Math.ceil(ttl / 1000) };
  }
  return { locked: false, retryAfterSeconds: 0 };
}
