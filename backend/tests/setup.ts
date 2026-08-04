import 'dotenv/config';
import path from 'path';
import os from 'os';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must be set to run the test suite');
}
if (!process.env.TEST_REDIS_URL) {
  throw new Error('TEST_REDIS_URL must be set to run the test suite');
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.REDIS_URL = process.env.TEST_REDIS_URL;
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'zentra-test-uploads');
