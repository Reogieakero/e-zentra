import { NextFunction, Request, Response } from 'express';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { ApiError } from '../utils/ApiError';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  userScoped?: boolean;
  failOpen?: boolean;
}

function requesterKey(req: Request, userScoped: boolean): string {
  if (userScoped) {
    const user = (req as Request & { user?: { id: string } }).user;
    if (user?.id) {
      return `user:${user.id}`;
    }
  }
  return `ip:${req.ip ?? 'unknown'}`;
}

export function redisRateLimit({ windowMs, max, keyPrefix, userScoped = false, failOpen = true }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${keyPrefix}:${requesterKey(req, userScoped)}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }
      const remaining = Math.max(0, max - count);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      if (count > max) {
        const ttl = await redis.pttl(key);
        const retryAfter = Math.max(1, Math.ceil(ttl / 1000));
        res.setHeader('Retry-After', retryAfter);
        res.setHeader('X-RateLimit-Reset', String(Date.now() + ttl));
        return next(ApiError.rateLimited());
      }
      res.setHeader('X-RateLimit-Reset', String(Date.now() + windowMs));
      return next();
    } catch (err) {
      if (failOpen) {
        logger.warn({ err, keyPrefix }, 'rate limiter unavailable; failing open');
        return next();
      }
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
