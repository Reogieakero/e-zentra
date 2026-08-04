import Redis from 'ioredis';
import { config } from '../config/env';

declare global {
  
  var __redis: Redis | undefined;
}

export const redis = globalThis.__redis ?? new Redis(config.redisUrl, { lazyConnect: false, maxRetriesPerRequest: 3 });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__redis = redis;
}
