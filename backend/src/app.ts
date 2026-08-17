import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { logger } from './lib/logger';
import { asyncHandler } from './utils/asyncHandler';
import { authenticate } from './middleware/authenticate';
import { errorHandler } from './middleware/errorHandler';
import { redisRateLimit } from './middleware/rateLimiter';
import { serveUpload } from './middleware/serveUpload';
import routes from './routes';
import { ApiError } from './utils/ApiError';
import { openApiSpec } from './openapi';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('etag', false);
  if (config.security.trustProxy > 0) {
    app.set('trust proxy', config.security.trustProxy);
  }

  app.use(
    helmet({
      hsts: config.security.enableHsts,
      contentSecurityPolicy: config.isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              frameAncestors: ["'none'"],
              imgSrc: ["'self'", 'data:'],
              styleSrc: ["'self'", "'unsafe-inline'"],
            },
          }
        : false,
      referrerPolicy: { policy: 'same-origin' },
      crossOriginEmbedderPolicy: false,
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

  if (config.enableApiDocs) {
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(openApiSpec, { customSiteTitle: 'Zentra API' })
    );
  }

  app.use('/uploads', authenticate, asyncHandler(serveUpload));

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
