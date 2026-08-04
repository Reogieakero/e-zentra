import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedUser } from './authenticate';

function getUser(req: Request): AuthenticatedUser {
  const user = (req as Request & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw ApiError.unauthorized();
  }
  return user;
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = getUser(req);
      if (!roles.includes(user.role)) {
        throw ApiError.forbidden(`Role '${user.role}' is not allowed to perform this action`);
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function requireAnyStaffRole() {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = getUser(req);
      if (user.role === 'student' || user.role === 'parent') {
        throw ApiError.forbidden('Staff role required');
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function requireActiveAccount() {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = getUser(req);
      if (user.accountStatus !== 'active') {
        throw ApiError.forbidden(`Account status is '${user.accountStatus}'`);
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function requireSelfOrRole(role: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = getUser(req);
      const targetId = (req.params as { id?: string }).id;
      if (user.role !== role && user.id !== targetId) {
        throw ApiError.forbidden('You may only access your own records');
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
