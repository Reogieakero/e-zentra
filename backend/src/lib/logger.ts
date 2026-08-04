import pino from 'pino';
import { config } from '../config/env';

export const logger = pino({
  level: config.isTest ? 'silent' : process.env.LOG_LEVEL ?? 'info',
  transport:
    config.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined,
});
