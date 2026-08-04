import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { redisRateLimit } from './middleware/rateLimiter';
import routes from './routes';
import { ApiError } from './utils/ApiError';
import { openApiSpec } from './openapi';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      hsts: config.security.enableHsts,
      contentSecurityPolicy: config.isProd ? undefined : false,
    })
  );

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new ApiError(403, 'FORBIDDEN', 'Origin not allowed by CORS policy'));
    },
    credentials: true,
  };
  app.use(cors(corsOptions));

  app.use(express.json({ limit: '2mb' }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info({ method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Date.now() - start }, 'request');
    });
    next();
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, { customSiteTitle: 'Zentra API' })
  );

  app.use('/uploads', express.static(path.resolve(config.security.uploadDir)));

  const globalLimiter = redisRateLimit({
    windowMs: 60 * 1000,
    max: config.rateLimit.globalPerMin,
    keyPrefix: 'rl:global',
  });

  app.use('/api/v1', globalLimiter, routes);

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(ApiError.notFound('Route not found'));
  });

  app.use(errorHandler as express.ErrorRequestHandler);

  return app;
}
