import { Prisma } from '@prisma/client';
import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../lib/logger';

function toPlainObject(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details !== undefined ? { details: err.details } : {}) },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'A record with the same unique value already exists',
          details: { target: err.meta?.target },
        },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Referenced record does not exist', details: { target: err.meta?.field_name } },
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid data supplied to the database' } });
    return;
  }

  const multerError = err as { name?: string; message?: string };
  if (multerError?.name && ['MulterError', 'LIMIT_FILE_SIZE', 'LIMIT_UNEXPECTED_FILE'].includes(multerError.name)) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: multerError.message ?? 'Upload failed' } });
    return;
  }

  const status = (err as { status?: number })?.status;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({
      error: { code: 'BAD_REQUEST', message: (err as Error).message ?? 'Bad request' },
    });
    return;
  }

  logger.error({ err: err instanceof Error ? { message: err.message, stack: err.stack } : err }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}

export function serializeForOutput<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => serializeForOutput(v)) as unknown as T;
  }
  if (value instanceof Prisma.Decimal) {
    return toPlainObject(value) as T;
  }
  if (value instanceof Date) {
    return toPlainObject(value) as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serializeForOutput(val);
    }
    return out as T;
  }
  return value;
}
