import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError';

type Source = 'body' | 'query' | 'params';

export function validate(schema: z.ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        code: i.code,
        message: i.message,
      }));
      return next(ApiError.validation('Validation failed', details));
    }
    (req as unknown as Record<string, unknown>)[source] = result.data;
    return next();
  };
}

export function validateSchema(schema: { body?: z.ZodTypeAny; query?: z.ZodTypeAny; params?: z.ZodTypeAny }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.params) {
        const p = schema.params.safeParse(req.params);
        if (!p.success) throw p.error;
        req.params = p.data;
      }
      if (schema.query) {
        const q = schema.query.safeParse(req.query);
        if (!q.success) throw q.error;
        req.query = q.data;
      }
      if (schema.body) {
        const b = schema.body.safeParse(req.body);
        if (!b.success) throw b.error;
        req.body = b.data;
      }
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.issues.map((i) => ({ path: i.path.join('.'), code: i.code, message: i.message }));
        return next(ApiError.validation('Validation failed', details));
      }
      return next(error);
    }
  };
}
