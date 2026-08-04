import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: import('@prisma/client').Role;
  accountStatus: import('@prisma/client').AccountStatus;
  firstName: string;
  lastName: string;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtl as jwt.SignOptions['expiresIn'] });
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized());
  }
  const token = header.slice('Bearer '.length);
  let payload: { sub?: string };
  try {
    payload = jwt.verify(token, config.jwt.accessSecret) as { sub?: string };
  } catch {
    return next(ApiError.unauthorized('Invalid or expired access token'));
  }
  if (!payload.sub) {
    return next(ApiError.unauthorized());
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, accountStatus: true, firstName: true, lastName: true },
  });
  if (!user) {
    return next(ApiError.unauthorized('Account no longer exists'));
  }
  if (user.accountStatus !== 'active') {
    return next(ApiError.forbidden(`Account status is '${user.accountStatus}'; only active accounts may act`));
  }
  (req as Request & { user: AuthenticatedUser }).user = user;
  return next();
}
