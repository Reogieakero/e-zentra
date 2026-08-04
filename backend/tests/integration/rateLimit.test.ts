import express from 'express';
import request from 'supertest';
import { redis } from '../../src/lib/redis';
import { errorHandler } from '../../src/middleware/errorHandler';
import { redisRateLimit } from '../../src/middleware/rateLimiter';

describe('Rate limiting', () => {
  afterEach(async () => {
    await redis.flushdb();
  });

  it('returns 429 with Retry-After once the limit is exceeded', async () => {
    const app = express();
    app.use(
      '/test',
      redisRateLimit({ windowMs: 60_000, max: 2, keyPrefix: 'rl:test:unique' }),
      (_req, res) => res.json({ ok: true })
    );
    app.use(errorHandler as express.ErrorRequestHandler);

    const first = await request(app).get('/test');
    const second = await request(app).get('/test');
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const third = await request(app).get('/test');
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('RATE_LIMITED');
    expect(Number(third.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect(Number(third.headers['x-ratelimit-remaining'])).toBe(0);
  });
});
