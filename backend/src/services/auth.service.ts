import { AccountStatus, GradeLevel, Prisma, Role } from '@prisma/client';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { config } from '../config/env';
import { prisma } from '../lib/prisma';
import { signAccessToken } from '../middleware/authenticate';
import { isLoginLockedOut, recordLoginFailure, resetLoginFailures } from '../middleware/rateLimiter';
import { ApiError } from '../utils/ApiError';
import { assertGradeBandOwnership } from '../utils/gradeBand';
import { sha256 } from '../utils/hash';
import { writeAudit } from './audit.service';
import { notify, notifyStudentAndParents } from './notification.service';

export interface RegisterStudentInput {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  contactNumber?: string;
  lrn: string;
  birthdate: string;
  sex: 'male' | 'female';
  gradeLevel: GradeLevel;
  sectionId?: string;
  address?: string;
}

export interface RegisterParentInput {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  contactNumber?: string;
  relationship: 'mother' | 'father' | 'guardian';
  occupation?: string;
  address?: string;
  childEmail?: string;
  childLrn?: string;
}

export interface RegisterTeacherInput {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  contactNumber?: string;
  employeeId: string;
  department?: string;
  dateHired?: string;
}

const PUBLIC_SELECT = {
  id: true,
  email: true,
  firstName: true,
  middleName: true,
  lastName: true,
  suffix: true,
  role: true,
  provisioningType: true,
  contactNumber: true,
  profilePhotoUrl: true,
  accountStatus: true,
  approvedBy: true,
  approvedAt: true,
  isVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export function toPublicUser(user: Prisma.UserGetPayload<{ select: typeof PUBLIC_SELECT }>) {
  return user;
}

function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

async function findOrThrowByEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw ApiError.notFound('Account not found');
  return user;
}

export async function registerStudent(input: RegisterStudentInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw ApiError.conflict('An account with this email already exists');
  const existingLrn = await prisma.studentProfile.findUnique({ where: { lrn: input.lrn } });
  if (existingLrn) throw ApiError.conflict('This LRN is already registered');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        suffix: input.suffix,
        role: 'student',
        provisioningType: 'self_registered',
        contactNumber: input.contactNumber,
        accountStatus: 'pending',
      },
      select: PUBLIC_SELECT,
    });
    await tx.studentProfile.create({
      data: {
        id: created.id,
        lrn: input.lrn,
        birthdate: new Date(input.birthdate),
        sex: input.sex,
        gradeLevel: input.gradeLevel,
        sectionId: input.sectionId,
        address: input.address,
      },
    });
    return created;
  });
  return { user: user };
}

export async function registerParent(input: RegisterParentInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  let childUser: { id: string; gradeLevel: GradeLevel } | null = null;
  if (input.childEmail || input.childLrn) {
    let child:
      | (Pick<Prisma.UserGetPayload<{ include: { studentProfile: { select: { gradeLevel: true } } } }>, 'id'> & {
          studentProfile: { gradeLevel: GradeLevel } | null;
        })
      | null = null;
    if (input.childEmail) {
      child = await prisma.user.findUnique({
        where: { email: input.childEmail.toLowerCase() },
        select: { id: true, studentProfile: { select: { gradeLevel: true } } },
      });
    } else if (input.childLrn) {
      child = await prisma.studentProfile
        .findUnique({
          where: { lrn: input.childLrn },
          select: { gradeLevel: true, user: { select: { id: true } } },
        })
        .then((p) => (p ? { id: p.user.id, studentProfile: { gradeLevel: p.gradeLevel } } : null));
    }
    if (!child || !child.studentProfile) {
      throw ApiError.badRequest('The linked child account was not found');
    }
    childUser = { id: child.id, gradeLevel: child.studentProfile.gradeLevel };
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        suffix: input.suffix,
        role: 'parent',
        provisioningType: 'self_registered',
        contactNumber: input.contactNumber,
        accountStatus: 'pending',
      },
      select: PUBLIC_SELECT,
    });
    await tx.parentProfile.create({
      data: {
        id: created.id,
        relationship: input.relationship,
        occupation: input.occupation,
        address: input.address,
      },
    });
    if (childUser) {
      await tx.parentStudentLink.upsert({
        where: { parentId_studentId: { parentId: created.id, studentId: childUser.id } },
        create: { parentId: created.id, studentId: childUser.id, status: 'pending_confirmation' },
        update: {},
      });
    }
    return created;
  });
  return { user };
}

export async function registerTeacher(input: RegisterTeacherInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw ApiError.conflict('An account with this email already exists');
  const existingEmp = await prisma.staffProfile.findUnique({ where: { employeeId: input.employeeId } });
  if (existingEmp) throw ApiError.conflict('This employee ID is already registered');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        suffix: input.suffix,
        role: 'teacher',
        provisioningType: 'self_registered',
        contactNumber: input.contactNumber,
        accountStatus: 'pending',
      },
      select: PUBLIC_SELECT,
    });
    await tx.staffProfile.create({
      data: {
        id: created.id,
        employeeId: input.employeeId,
        department: input.department,
        dateHired: input.dateHired ? new Date(input.dateHired) : null,
      },
    });
    return created;
  });
  return { user };
}

function gradeBandTarget(role: Role, target: { role: Role; studentProfile?: { gradeLevel: GradeLevel } | null; staffProfile?: unknown }): GradeLevel | 'teacher' {
  if (target.role === 'teacher') return 'teacher';
  if (!target.studentProfile) throw ApiError.badRequest('Cannot determine grade band for this account');
  return target.studentProfile.gradeLevel;
}

export async function approveAccount(targetUserId: string, approverId: string): Promise<{ user: unknown }> {
  const approver = await prisma.user.findUnique({ where: { id: approverId } });
  if (!approver) throw ApiError.notFound('Approver not found');

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { studentProfile: { select: { gradeLevel: true } }, parentProfile: true },
  });
  if (!target) throw ApiError.notFound('Account not found');
  if (target.accountStatus === 'active') throw ApiError.conflict('Account is already active');

  const bandTarget = gradeBandTarget(approver.role, target);
  if (bandTarget === 'teacher') {
    if (approver.role !== 'registrar') {
      throw ApiError.forbidden('Only the Registrar approves teacher accounts school-wide');
    }
  } else {
    assertGradeBandOwnership(approver.role, bandTarget);
  }

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: { accountStatus: 'active', approvedBy: approverId, approvedAt: new Date() },
      select: PUBLIC_SELECT,
    });

    if (target.role === 'student') {
      const links = await tx.parentStudentLink.findMany({ where: { studentId: targetUserId, status: 'pending_confirmation' } });
      for (const link of links) {
        await tx.parentStudentLink.update({
          where: { id: link.id },
          data: { status: 'confirmed', confirmedBy: approverId, confirmedAt: new Date() },
        });
        await notify({
          recipientId: link.parentId,
          sourceTable: 'parent_student_links',
          sourceRecordId: link.id,
          notificationType: 'parent_link_confirmed',
          title: 'Parent link confirmed',
          message: `Your link to student ${target.email} was confirmed.`,
        });
      }
    }

    if (target.role === 'parent') {
      const links = await tx.parentStudentLink.findMany({ where: { parentId: targetUserId, status: 'pending_confirmation' } });
      for (const link of links) {
        await tx.parentStudentLink.update({
          where: { id: link.id },
          data: { status: 'confirmed', confirmedBy: approverId, confirmedAt: new Date() },
        });
      }
    }

    return updated;
  });

  await writeAudit({
    actorId: approverId,
    action: 'APPROVE',
    tableName: 'users',
    recordId: targetUserId,
    newValue: { accountStatus: 'active' },
  });
  await notify({
    recipientId: targetUserId,
    sourceTable: 'users',
    sourceRecordId: targetUserId,
    notificationType: 'account_approved',
    title: 'Account approved',
    message: 'Your Zentra account has been approved and is now active.',
  });

  return { user };
}

export async function rejectAccount(targetUserId: string, approverId: string): Promise<{ user: unknown }> {
  const approver = await prisma.user.findUnique({ where: { id: approverId } });
  if (!approver) throw ApiError.notFound('Approver not found');

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { studentProfile: { select: { gradeLevel: true } } },
  });
  if (!target) throw ApiError.notFound('Account not found');
  if (target.accountStatus === 'rejected') throw ApiError.conflict('Account is already rejected');

  const bandTarget = gradeBandTarget(approver.role, target);
  if (bandTarget === 'teacher') {
    if (approver.role !== 'registrar') throw ApiError.forbidden('Only the Registrar rejects teacher accounts school-wide');
  } else {
    assertGradeBandOwnership(approver.role, bandTarget);
  }

  const user = await prisma.user.update({
    where: { id: targetUserId },
    data: { accountStatus: 'rejected', approvedBy: approverId, approvedAt: new Date() },
    select: PUBLIC_SELECT,
  });

  await writeAudit({
    actorId: approverId,
    action: 'REJECT',
    tableName: 'users',
    recordId: targetUserId,
    newValue: { accountStatus: 'rejected' },
  });
  await notify({
    recipientId: targetUserId,
    sourceTable: 'users',
    sourceRecordId: targetUserId,
    notificationType: 'account_rejected',
    title: 'Account rejected',
    message: 'Your Zentra account registration was rejected.',
  });

  return { user };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  const { locked, retryAfterSeconds } = await isLoginLockedOut(user.id);
  if (locked) {
    throw new ApiError(429, 'RATE_LIMITED', 'Too many failed login attempts. Try again later.', {
      retryAfterSeconds,
    });
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    const { attempts, locked: nowLocked, retryAfterSeconds: retry } = await recordLoginFailure(
      user.id,
      config.rateLimit.loginMaxAttempts,
      config.rateLimit.loginLockoutMs
    );
    if (nowLocked) {
      throw new ApiError(429, 'RATE_LIMITED', 'Too many failed login attempts. Account temporarily locked.', {
        retryAfterSeconds: retry,
      });
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password', { remainingAttempts: Math.max(0, config.rateLimit.loginMaxAttempts - attempts) });
  }

  if (user.accountStatus !== 'active') {
    throw new ApiError(403, 'FORBIDDEN', `Account status is '${user.accountStatus}'; login is only allowed for active accounts`);
  }

  await resetLoginFailures(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const publicUser = await prisma.user.findUnique({ where: { id: user.id }, select: PUBLIC_SELECT });
  return { user: publicUser, tokens: await issueTokens(user.id) };
}

function generateRefreshToken(): string {
  return randomBytes(48).toString('hex');
}

async function issueTokens(userId: string) {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: sha256(refreshToken), expiresAt },
  });
  return { accessToken: signAccessToken(userId), refreshToken, expiresAt };
}

export async function refreshTokens(refreshToken: string) {
  const tokenHash = sha256(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt) {
    throw ApiError.unauthorized('Invalid refresh token');
  }
  if (stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token expired');
  }
  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || user.accountStatus !== 'active') {
    throw ApiError.unauthorized('Account is not active');
  }

  const newRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByTokenHash: sha256(newRefreshToken) },
    }),
    prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: sha256(newRefreshToken), expiresAt },
    }),
  ]);

  return {
    accessToken: signAccessToken(user.id),
    refreshToken: newRefreshToken,
    expiresAt,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
  if (!stored || stored.revokedAt) return;
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Account not found');
  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) throw ApiError.forbidden('Current password is incorrect');

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await revokeAllRefreshTokens(userId);
  await writeAudit({ actorId: userId, action: 'PASSWORD_CHANGE', tableName: 'users', recordId: userId });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...PUBLIC_SELECT,
      studentProfile: { select: { lrn: true, gradeLevel: true, sectionId: true } },
      parentProfile: { select: { relationship: true } },
      staffProfile: { select: { employeeId: true, department: true } },
    },
  });
  if (!user) throw ApiError.notFound('Account not found');
  return { user };
}

export { PUBLIC_SELECT };
