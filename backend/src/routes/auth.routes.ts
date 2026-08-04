import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { authenticate } from '../middleware/authenticate';
import { redisRateLimit } from '../middleware/rateLimiter';
import { validateSchema } from '../middleware/validate';
import { emailSchema, passwordSchema, nameSchema, optionalName, gradeLevelEnum } from '../schemas/common';
import {
  changePassword,
  getMe,
  login,
  logout,
  refreshTokens,
  registerParent,
  registerStudent,
  registerTeacher,
} from '../services/auth.service';

const router = Router();

const authLimiter = redisRateLimit({
  windowMs: 60 * 1000,
  max: config.rateLimit.authPerMin,
  keyPrefix: 'rl:auth',
});

const sensitiveWriteLimiter = redisRateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyPrefix: 'rl:auth-write',
  userScoped: true,
});

const registerStudentSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    middleName: optionalName,
    lastName: nameSchema,
    suffix: z.string().trim().max(10).optional().or(z.literal('')),
    contactNumber: z.string().trim().max(20).optional().or(z.literal('')),
    lrn: z.string().trim().min(5).max(20),
    birthdate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    sex: z.enum(['male', 'female']),
    gradeLevel: gradeLevelEnum,
    sectionId: z.string().uuid().optional(),
    address: z.string().trim().max(1000).optional(),
  })
  .strict();

const registerParentSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    middleName: optionalName,
    lastName: nameSchema,
    suffix: z.string().trim().max(10).optional().or(z.literal('')),
    contactNumber: z.string().trim().max(20).optional().or(z.literal('')),
    relationship: z.enum(['mother', 'father', 'guardian']),
    occupation: z.string().trim().max(100).optional(),
    address: z.string().trim().max(1000).optional(),
    childEmail: emailSchema.optional(),
    childLrn: z.string().trim().max(20).optional(),
  })
  .strict()
  .refine((data) => !(data.childEmail && data.childLrn), {
    message: 'Provide either childEmail or childLrn, not both',
    path: ['childLrn'],
  });

const registerTeacherSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    middleName: optionalName,
    lastName: nameSchema,
    suffix: z.string().trim().max(10).optional().or(z.literal('')),
    contactNumber: z.string().trim().max(20).optional().or(z.literal('')),
    employeeId: z.string().trim().min(2).max(20),
    department: z.string().trim().max(100).optional(),
    dateHired: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();

const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

const refreshSchema = z
  .object({
    refreshToken: z.string().min(32).max(256),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must differ from the current password',
    path: ['newPassword'],
  });

router.post('/register/student', authLimiter, validateSchema({ body: registerStudentSchema }), asyncHandler(async (req, res) => {
  const { user } = await registerStudent(req.body);
  res.status(201).json({ data: user });
}));

router.post('/register/parent', authLimiter, validateSchema({ body: registerParentSchema }), asyncHandler(async (req, res) => {
  const { user } = await registerParent(req.body);
  res.status(201).json({ data: user });
}));

router.post('/register/teacher', authLimiter, validateSchema({ body: registerTeacherSchema }), asyncHandler(async (req, res) => {
  const { user } = await registerTeacher(req.body);
  res.status(201).json({ data: user });
}));

router.post('/login', authLimiter, validateSchema({ body: loginSchema }), asyncHandler(async (req, res) => {
  const result = await login(req.body.email, req.body.password);
  res.json({ data: result });
}));

router.post('/refresh', authLimiter, validateSchema({ body: refreshSchema }), asyncHandler(async (req, res) => {
  const result = await refreshTokens(req.body.refreshToken);
  res.json({ data: result });
}));

router.post('/logout', authLimiter, validateSchema({ body: refreshSchema }), asyncHandler(async (req, res) => {
  await logout(req.body.refreshToken);
  res.status(204).send();
}));

router.use(authenticate);

router.post('/change-password', sensitiveWriteLimiter, validateSchema({ body: changePasswordSchema }), asyncHandler(async (req, res) => {
  const user = req.user!;
  await changePassword(user.id, req.body.currentPassword, req.body.newPassword);
  res.status(204).send();
}));

router.get('/me', asyncHandler(async (req, res) => {
  const { user } = await getMe(req.user!.id);
  res.json({ data: user });
}));

export default router;
