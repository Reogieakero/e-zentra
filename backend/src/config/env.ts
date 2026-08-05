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
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URL: z.string().url().optional(),
  OCR_ENGINE: z.enum(['fake', 'paddle', 'textract']).default('fake'),
  OCR_SERVICE_URL: z.string().url().optional(),
  OCR_SERVICE_TOKEN: z.string().optional(),
  OCR_CONFIDENCE_THRESHOLD: z.coerce.number().default(0.9),
  OCR_AUTO_APPROVE_THRESHOLD: z.coerce.number().default(0.97),
  OCR_JOB_BATCH_SIZE: z.coerce.number().default(5),
  OCR_JOB_POLL_MS: z.coerce.number().default(2000),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  PASSWORD_RESET_TTL_MIN: z.coerce.number().default(30),
  FRONTEND_URL: z.string().url().optional(),
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
  ocr: {
    engine: parsed.data.OCR_ENGINE,
    serviceUrl: parsed.data.OCR_SERVICE_URL,
    serviceToken: parsed.data.OCR_SERVICE_TOKEN,
    confidenceThreshold: parsed.data.OCR_CONFIDENCE_THRESHOLD,
    autoApproveThreshold: parsed.data.OCR_AUTO_APPROVE_THRESHOLD,
    jobBatchSize: parsed.data.OCR_JOB_BATCH_SIZE,
    jobPollMs: parsed.data.OCR_JOB_POLL_MS,
  },
  enableApiDocs: parsed.data.ENABLE_API_DOCS === undefined ? parsed.data.NODE_ENV !== 'production' : parsed.data.ENABLE_API_DOCS === 'true',
  supabase: {
    url: parsed.data.SUPABASE_URL,
    anonKey: parsed.data.SUPABASE_ANON_KEY,
    googleRedirectUrl: parsed.data.GOOGLE_OAUTH_REDIRECT_URL,
    enabled: Boolean(parsed.data.SUPABASE_URL && parsed.data.SUPABASE_ANON_KEY),
  },
  smtp: {
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    user: parsed.data.SMTP_USER,
    pass: parsed.data.SMTP_PASS,
    from: parsed.data.SMTP_FROM,
    enabled:
      parsed.data.NODE_ENV !== 'test' &&
      Boolean(parsed.data.SMTP_HOST && parsed.data.SMTP_USER && parsed.data.SMTP_PASS && parsed.data.SMTP_FROM),
  },
  passwordReset: {
    ttlMs: parsed.data.PASSWORD_RESET_TTL_MIN * 60 * 1000,
  },
  frontendUrl: parsed.data.FRONTEND_URL ?? 'http://localhost:3001',
};

export type AppConfig = typeof config;
