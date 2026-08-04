import 'dotenv/config';
import { z } from 'zod';

const boolFromString = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? defaultValue : v === 'true'));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  TEST_DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  TEST_REDIS_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(30),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  RATE_LIMIT_GLOBAL_PER_MIN: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_PER_MIN: z.coerce.number().default(5),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().default(5),
  LOGIN_LOCKOUT_MS: z.coerce.number().default(900000),
  ENABLE_HSTS: z.string().optional(),
  TRUST_PROXY: z.coerce.number().default(0),
  MAX_UPLOAD_BYTES: z.coerce.number().default(5242880),
  MAX_USER_UPLOAD_BYTES: z.coerce.number().default(52428800),
  ALLOWED_IMAGE_MIMES: z.string().default('image/jpeg,image/png,image/webp'),
  UPLOAD_DIR: z.string().default('./uploads'),
  RECORD_FLAG_ESCALATION_ENABLED: boolFromString(true),
  RECORD_FLAG_ESCALATION_DAYS: z.coerce.number().default(7),
  ENABLE_API_DOCS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  testDatabaseUrl: parsed.data.TEST_DATABASE_URL,
  redisUrl: parsed.data.REDIS_URL,
  testRedisUrl: parsed.data.TEST_REDIS_URL,
  jwt: {
    accessSecret: parsed.data.JWT_ACCESS_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessTtl: parsed.data.JWT_ACCESS_TTL,
    refreshTtlDays: parsed.data.JWT_REFRESH_TTL_DAYS,
  },
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  rateLimit: {
    globalPerMin: parsed.data.NODE_ENV === 'test' ? 100000 : parsed.data.RATE_LIMIT_GLOBAL_PER_MIN,
    authPerMin: parsed.data.NODE_ENV === 'test' ? 100000 : parsed.data.RATE_LIMIT_AUTH_PER_MIN,
    loginMaxAttempts: parsed.data.NODE_ENV === 'test' ? 100000 : parsed.data.LOGIN_MAX_ATTEMPTS,
    loginLockoutMs: parsed.data.LOGIN_LOCKOUT_MS,
  },
  security: {
    enableHsts: parsed.data.ENABLE_HSTS === undefined ? parsed.data.NODE_ENV === 'production' : parsed.data.ENABLE_HSTS === 'true',
    trustProxy: parsed.data.TRUST_PROXY,
    maxUploadBytes: parsed.data.MAX_UPLOAD_BYTES,
    maxUserUploadBytes: parsed.data.MAX_USER_UPLOAD_BYTES,
    allowedImageMimes: parsed.data.ALLOWED_IMAGE_MIMES.split(',').map((s) => s.trim()),
    uploadDir: parsed.data.UPLOAD_DIR,
  },
  flags: {
    recordFlagEscalationEnabled: parsed.data.RECORD_FLAG_ESCALATION_ENABLED,
    recordFlagEscalationDays: parsed.data.RECORD_FLAG_ESCALATION_DAYS,
  },
  enableApiDocs: parsed.data.ENABLE_API_DOCS === undefined ? parsed.data.NODE_ENV !== 'production' : parsed.data.ENABLE_API_DOCS === 'true',
};

export type AppConfig = typeof config;
