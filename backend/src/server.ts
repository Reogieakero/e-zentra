import { createApp } from './app';
import { config } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { startEscalationJob } from './jobs/flagEscalation';
import { startOcrWorker } from './services/ocr.service';
import { startBackupJob } from './jobs/backupJob';
import { startDashboardCacheWarmer, stopDashboardCacheWarmer } from './services/dashboard.service';
const app = createApp();
const server = app.listen(config.port, () => {
    logger.info(`Zentra API listening on http://localhost:${config.port}`);
    logger.info(`OpenAPI docs at http://localhost:${config.port}/api-docs`);
    startEscalationJob();
    startOcrWorker();
    startBackupJob();
    startDashboardCacheWarmer();
});
async function shutdown(signal: string) {
    logger.info(`Received ${signal}, shutting down`);
    stopDashboardCacheWarmer();
    server.close(async () => {
        await prisma.$disconnect();
        redis.disconnect();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
