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
  authenticateGoogleToken,
  changePassword,
  confirmPasswordReset,
  getGoogleAuthUrl,
  getMe,
  login,
  loginForPortal,
  logout,
  refreshTokens,
  registerGoogleAccount,
  registerParent,
  registerStudent,
  registerTeacher,
  requestPasswordReset,
  verifyPasswordResetToken,
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

router.post('/login/student', authLimiter, validateSchema({ body: loginSchema }), asyncHandler(async (req, res) => {
  const result = await loginForPortal(req.body.email, req.body.password, 'student');
  res.json({ data: result });
}));

router.post('/login/parent', authLimiter, validateSchema({ body: loginSchema }), asyncHandler(async (req, res) => {
  const result = await loginForPortal(req.body.email, req.body.password, 'parent');
  res.json({ data: result });
}));

router.post('/login/staff', authLimiter, validateSchema({ body: loginSchema }), asyncHandler(async (req, res) => {
  const result = await loginForPortal(req.body.email, req.body.password, 'staff');
  res.json({ data: result });
}));

const googleUrlQuery = z
  .object({
    redirectTo: z.string().url().optional().or(z.string().trim().min(1)),
  })
  .strict();

const googleCallbackSchema = z
  .object({
    accessToken: z.string().min(20),
    portal: z.enum(['student', 'parent', 'staff']).optional(),
    mode: z.enum(['login', 'signup']).optional(),
  })
  .strict();

router.get('/oauth/google/url', authLimiter, validateSchema({ query: googleUrlQuery }), asyncHandler(async (req, res) => {
  const result = await getGoogleAuthUrl(req.query.redirectTo as string | undefined ?? config.supabase.googleRedirectUrl ?? '');
  res.json({ data: result });
}));

router.post('/oauth/google/callback', authLimiter, validateSchema({ body: googleCallbackSchema }), asyncHandler(async (req, res) => {
  const result = await authenticateGoogleToken(req.body.accessToken, req.body.portal, req.body.mode ?? 'login');
  res.json({ data: result });
}));

const googleRegisterBase = {
  accessToken: z.string().min(20),
  middleName: optionalName,
  suffix: z.string().trim().max(10).optional().or(z.literal('')),
  contactNumber: z.string().trim().max(20).optional().or(z.literal('')),
};

const googleRegisterStudentSchema = z
  .object({
    ...googleRegisterBase,
    role: z.literal('student'),
    firstName: nameSchema,
    lastName: nameSchema,
    lrn: z.string().trim().min(5).max(20),
    birthdate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    sex: z.enum(['male', 'female']),
    gradeLevel: gradeLevelEnum,
    address: z.string().trim().max(1000).optional(),
  })
  .strict();

const googleRegisterParentSchema = z
  .object({
    ...googleRegisterBase,
    role: z.literal('parent'),
    firstName: nameSchema,
    lastName: nameSchema,
    relationship: z.enum(['mother', 'father', 'guardian']),
    occupation: z.string().trim().max(100).optional(),
    address: z.string().trim().max(1000).optional(),
    childEmail: emailSchema.optional(),
    childLrn: z.string().trim().max(20).optional(),
  })
  .strict();

const googleRegisterTeacherSchema = z
  .object({
    ...googleRegisterBase,
    role: z.literal('teacher'),
    firstName: nameSchema,
    lastName: nameSchema,
    employeeId: z.string().trim().min(2).max(20),
    department: z.string().trim().max(100).optional(),
    dateHired: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();

const googleRegisterSchema = z.discriminatedUnion('role', [
  googleRegisterStudentSchema,
  googleRegisterParentSchema,
  googleRegisterTeacherSchema,
]);

router.post('/oauth/google/register', authLimiter, validateSchema({ body: googleRegisterSchema }), asyncHandler(async (req, res) => {
  const { user } = await registerGoogleAccount(req.body);
  res.status(201).json({ data: user });
}));

router.post('/refresh', authLimiter, validateSchema({ body: refreshSchema }), asyncHandler(async (req, res) => {
  const result = await refreshTokens(req.body.refreshToken);
  res.json({ data: result });
}));

router.post('/logout', authLimiter, validateSchema({ body: refreshSchema }), asyncHandler(async (req, res) => {
  await logout(req.body.refreshToken);
  res.status(204).send();
}));

const passwordResetRequestSchema = z
  .object({
    email: emailSchema,
    portal: z.enum(['student', 'parent', 'staff']).optional(),
  })
  .strict();

const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(32).max(256),
    newPassword: passwordSchema,
  })
  .strict();

router.post('/password-reset/request', authLimiter, validateSchema({ body: passwordResetRequestSchema }), asyncHandler(async (req, res) => {
  const result = await requestPasswordReset(req.body.email, req.body.portal);
  res.json({ data: result });
}));

router.get('/password-reset/verify/:token', authLimiter, asyncHandler(async (req, res) => {
  const result = await verifyPasswordResetToken(req.params.token);
  res.json({ data: result });
}));

router.post('/password-reset/confirm', authLimiter, validateSchema({ body: passwordResetConfirmSchema }), asyncHandler(async (req, res) => {
  await confirmPasswordReset(req.body.token, req.body.newPassword);
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
