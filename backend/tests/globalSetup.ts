import { execSync } from 'child_process';
import 'dotenv/config';

export default async function globalSetup(): Promise<void> {
  const testDb = process.env.TEST_DATABASE_URL;
  const testRedis = process.env.TEST_REDIS_URL;
  if (!testDb || !testRedis) {
    throw new Error('TEST_DATABASE_URL and TEST_REDIS_URL must be set');
  }
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDb },
    stdio: 'inherit',
  });
}
