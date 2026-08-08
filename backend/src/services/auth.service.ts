import { AccountStatus, GradeLevel, Prisma, Role } from '@prisma/client';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { config } from '../config/env';
import { prisma } from '../lib/prisma';
import { getSupabase } from '../lib/supabase';
import { signAccessToken } from '../middleware/authenticate';
import { isLoginLockedOut, recordLoginFailure, resetLoginFailures } from '../middleware/rateLimiter';
import { ApiError } from '../utils/ApiError';
import { assertGradeBandOwnership } from '../utils/gradeBand';
import { sha256 } from '../utils/hash';
import { writeAudit, writeSecurityEvent } from './audit.service';
import { sendMail } from './mailer.service';
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


export interface RegisterOpts {
  email?: string;
  password?: string;
  avatarUrl?: string | null;
  nameOverrides?: { firstName?: string; lastName?: string };
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

export async function registerStudent(input: RegisterStudentInput, opts?: RegisterOpts) {
  const email = (opts?.email ?? input.email).toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');
  const existingLrn = await prisma.studentProfile.findUnique({ where: { lrn: input.lrn } });
  if (existingLrn) throw ApiError.conflict('This LRN is already registered');

  const passwordHash = await hashPassword(opts?.password ?? input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName: opts?.nameOverrides?.firstName ?? input.firstName,
        middleName: input.middleName,
        lastName: opts?.nameOverrides?.lastName ?? input.lastName,
        suffix: input.suffix,
        role: 'student',
        provisioningType: 'self_registered',
        contactNumber: input.contactNumber,
        profilePhotoUrl: opts?.avatarUrl ?? undefined,
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

export async function registerParent(input: RegisterParentInput, opts?: RegisterOpts) {
  const email = (opts?.email ?? input.email).toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
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

  const passwordHash = await hashPassword(opts?.password ?? input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName: opts?.nameOverrides?.firstName ?? input.firstName,
        middleName: input.middleName,
        lastName: opts?.nameOverrides?.lastName ?? input.lastName,
        suffix: input.suffix,
        role: 'parent',
        provisioningType: 'self_registered',
        contactNumber: input.contactNumber,
        profilePhotoUrl: opts?.avatarUrl ?? undefined,
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

export async function registerTeacher(input: RegisterTeacherInput, opts?: RegisterOpts) {
  const email = (opts?.email ?? input.email).toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');
  const existingEmp = await prisma.staffProfile.findUnique({ where: { employeeId: input.employeeId } });
  if (existingEmp) throw ApiError.conflict('This employee ID is already registered');

  const passwordHash = await hashPassword(opts?.password ?? input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName: opts?.nameOverrides?.firstName ?? input.firstName,
        middleName: input.middleName,
        lastName: opts?.nameOverrides?.lastName ?? input.lastName,
        suffix: input.suffix,
        role: 'teacher',
        provisioningType: 'self_registered',
        contactNumber: input.contactNumber,
        profilePhotoUrl: opts?.avatarUrl ?? undefined,
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

const STAFF_ROLES: Role[] = ['teacher', 'registrar', 'record_keeper', 'adm_coordinator', 'guidance_counselor', 'principal', 'nurse'];

function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

export type ResetPortal = 'student' | 'parent' | 'staff';

function roleMatchesPortal(role: Role, portal: ResetPortal): boolean {
  if (portal === 'student') return role === 'student';
  if (portal === 'parent') return role === 'parent';
  return isStaffRole(role);
}

function roleToPortal(role: Role): ResetPortal {
  if (role === 'student') return 'student';
  if (role === 'parent') return 'parent';
  if (isStaffRole(role)) return 'staff';
  return 'student';
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    await writeSecurityEvent(
      '00000000-0000-0000-0000-000000000000',
      'login_failed_unknown_email',
      { email: email.toLowerCase() }
    ).catch(() => undefined);
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
      await writeSecurityEvent(user.id, 'login_lockout', {
        reason: 'Maximum failed login attempts reached',
        attempts,
      }).catch(() => undefined);
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


export async function loginForPortal(email: string, password: string, portal: 'student' | 'parent' | 'staff') {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  if (portal === 'student' && user.role !== 'student') {
    throw ApiError.forbidden('This account is not a student account');
  }
  if (portal === 'parent' && user.role !== 'parent') {
    throw ApiError.forbidden('This account is not a parent account');
  }
  if (portal === 'staff' && !isStaffRole(user.role)) {
    throw ApiError.forbidden('This account is not a staff account');
  }

  const result = await login(email, password);
  return result;
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
    if (stored && stored.revokedAt && stored.replacedByTokenHash) {
      await handleRefreshTokenReuse(stored.userId, 'A previously rotated refresh token was reused (possible token theft)');
    }
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

  const rotated = await prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedByTokenHash: sha256(newRefreshToken) },
    });
    if (revoked.count === 0) {
      return { conflicted: true };
    }
    await tx.refreshToken.create({
      data: { userId: user.id, tokenHash: sha256(newRefreshToken), expiresAt },
    });
    return { conflicted: false };
  });

  if (rotated.conflicted) {
    await handleRefreshTokenReuse(user.id, 'Refresh token was concurrently reused (possible token theft)');
    throw ApiError.unauthorized('Invalid refresh token');
  }

  return {
    accessToken: signAccessToken(user.id),
    refreshToken: newRefreshToken,
    expiresAt,
  };
}

async function handleRefreshTokenReuse(userId: string, reason: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await writeSecurityEvent(userId, 'refresh_token_reuse', { reason });
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

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = config.passwordReset.ttlMs;

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildResetEmail(resetUrl: string, firstName: string): { subject: string; text: string; html: string } {
  const minutes = Math.round(RESET_TOKEN_TTL_MS / 60000);
  const name = escapeHtml(firstName);
  const year = new Date().getFullYear();
  const subject = 'Reset your password';

  const text = `Hi ${firstName},

We received a request to reset your password for your Zentra account. Follow the link below to choose a new one. This link expires in ${minutes} minutes.

${resetUrl}

If you didn't request this, you can safely ignore this email and your password will stay the same.

— Zentra`;

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 16px 40px -12px rgba(0,0,0,0.18);">
            <tr>
              <td align="center" bgcolor="#16a34a" style="background-image:linear-gradient(135deg,#16a34a,#22c55e);background-color:#16a34a;padding:32px 24px 28px;">
                <span style="display:inline-block;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.35);border-radius:8px;padding:8px 16px;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">Zentra</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 4px;">
                <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.02em;line-height:1.2;">Reset your password</h1>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#6b7280;">Hi ${name},</p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">We received a request to reset your password for your Zentra account. Click the button below to choose a new one. This link expires in ${minutes} minutes.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 40px;">
                <a href="${resetUrl}" style="display:inline-block;background-image:linear-gradient(135deg,#16a34a,#22c55e);background-color:#16a34a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 28px;border-radius:10px;box-shadow:0 6px 16px -6px rgba(22,163,74,0.5);">Reset password</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px;">
                <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#9ca3af;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;color:#6b7280;">${resetUrl}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;background-color:#f9fafb;border-top:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">If you didn't request this, you can safely ignore this email and your password will stay the same.</p>
                <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;">&copy; ${year} Zentra &middot; Every learner&apos;s record, one system.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  return { subject, text, html };
}


export async function requestPasswordReset(email: string, portal?: ResetPortal) {
  const normalized = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    await writeSecurityEvent('00000000-0000-0000-0000-000000000000', 'password_reset_unknown_email', {
      email: normalized,
      portal,
    }).catch(() => undefined);
    return { delivered: false, devResetUrl: null, mismatch: null };
  }

  if (portal && !roleMatchesPortal(user.role, portal)) {
    const actual = roleToPortal(user.role);
    await writeSecurityEvent(user.id, 'password_reset_role_mismatch', { email: normalized, portal, actual }).catch(
      () => undefined
    );
    return { delivered: false, devResetUrl: null, mismatch: actual };
  }


  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });

  const raw = randomBytes(RESET_TOKEN_BYTES).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(raw), expiresAt } });

  const resetUrl = `${config.frontendUrl}/reset-password?token=${raw}`;
  const mail = buildResetEmail(resetUrl, user.firstName);
  const delivered = await sendMail({ to: user.email, subject: mail.subject, text: mail.text, html: mail.html });

  await writeSecurityEvent(user.id, 'password_reset_requested', { delivered }).catch(() => undefined);
  return { delivered, devResetUrl: delivered ? null : resetUrl, mismatch: null };
}


export async function verifyPasswordResetToken(raw: string) {
  const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!token) throw ApiError.badRequest('This password reset link is invalid or has expired');
  if (token.usedAt) throw ApiError.badRequest('This password reset link has already been used');
  if (token.expiresAt < new Date()) throw ApiError.badRequest('This password reset link has expired');

  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) throw ApiError.badRequest('This password reset link is invalid or has expired');
  return { email: user.email };
}


export async function confirmPasswordReset(raw: string, newPassword: string) {
  const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!token) throw ApiError.badRequest('This password reset link is invalid or has expired');
  if (token.usedAt) throw ApiError.badRequest('This password reset link has already been used');
  if (token.expiresAt < new Date()) throw ApiError.badRequest('This password reset link has expired');

  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) throw ApiError.badRequest('This password reset link is invalid or has expired');

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, lastLoginAt: null } }),
    prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
  ]);
  await revokeAllRefreshTokens(user.id);
  await writeAudit({ actorId: user.id, action: 'PASSWORD_RESET', tableName: 'users', recordId: user.id });
  await writeSecurityEvent(user.id, 'password_reset_completed', {}).catch(() => undefined);
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


export async function getGoogleAuthUrl(redirectTo: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw ApiError.internal(`Google sign-in could not be started: ${error.message}`);
  return { url: data.url };
}


export interface GoogleIdentity {
  email: string;
  name: string;
  avatarUrl: string | null;
}

async function resolveGoogleIdentity(accessToken: string): Promise<GoogleIdentity> {
  const supabase = getSupabase();
  const {
    data: { user: sbUser },
    error,
  } = await supabase.auth.getUser(accessToken);
  if (error || !sbUser?.email) {
    throw ApiError.unauthorized('Invalid Google session');
  }
  const meta = (sbUser.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    sbUser.email;
  const avatarUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    null;
  return { email: sbUser.email.toLowerCase(), name, avatarUrl };
}


export async function authenticateGoogleToken(
  accessToken: string,
  portal: 'student' | 'parent' | 'staff' | undefined,
  mode: 'login' | 'signup' = 'login'
) {
  const identity = await resolveGoogleIdentity(accessToken);
  const user = await prisma.user.findUnique({ where: { email: identity.email } });
  if (!user) {
    return { needsSignup: true, identity: { email: identity.email, name: identity.name, avatarUrl: identity.avatarUrl } };
  }

  if (user.accountStatus !== 'active') {
    throw ApiError.forbidden(`Account status is '${user.accountStatus}'; login is only allowed for active accounts`);
  }

  if (mode === 'login') {
    if (portal === 'student' && user.role !== 'student') {
      throw ApiError.forbidden('This Google account is not linked to a student account');
    }
    if (portal === 'parent' && user.role !== 'parent') {
      throw ApiError.forbidden('This Google account is not linked to a parent account');
    }
    if (portal === 'staff' && !isStaffRole(user.role)) {
      throw ApiError.forbidden('This Google account is not linked to a staff account');
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const publicUser = await prisma.user.findUnique({ where: { id: user.id }, select: PUBLIC_SELECT });
  return { user: publicUser, tokens: await issueTokens(user.id) };
}

export interface GoogleRegisterInput {
  accessToken: string;
  role: 'student' | 'parent' | 'teacher';
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  contactNumber?: string;
  lrn?: string;
  birthdate?: string;
  sex?: 'male' | 'female';
  gradeLevel?: GradeLevel;
  address?: string;
  relationship?: 'mother' | 'father' | 'guardian';
  occupation?: string;
  childEmail?: string;
  childLrn?: string;
  employeeId?: string;
  department?: string;
  dateHired?: string;
}


export async function registerGoogleAccount(input: GoogleRegisterInput) {
  const identity = await resolveGoogleIdentity(input.accessToken);
  const existing = await prisma.user.findUnique({ where: { email: identity.email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const randomPassword = randomBytes(32).toString('base64');
  const nameParts = identity.name.split(' ').filter(Boolean);
  const firstName = input.firstName?.trim() || nameParts[0] || '';
  const lastName = input.lastName?.trim() || nameParts.slice(1).join(' ') || '';

  const opts: RegisterOpts = {
    email: identity.email,
    password: randomPassword,
    avatarUrl: identity.avatarUrl,
    nameOverrides: { firstName, lastName },
  };

  switch (input.role) {
    case 'student':
      return registerStudent(
        {
          email: '',
          password: '',
          firstName: '',
          middleName: input.middleName,
          lastName: '',
          suffix: input.suffix,
          contactNumber: input.contactNumber,
          lrn: input.lrn ?? '',
          birthdate: input.birthdate ?? '',
          sex: input.sex ?? 'male',
          gradeLevel: input.gradeLevel ?? 'grade_7',
          address: input.address,
        },
        opts
      );
    case 'parent':
      if (input.childEmail && input.childLrn) {
        throw ApiError.badRequest('Provide either childEmail or childLrn, not both');
      }
      return registerParent(
        {
          email: '',
          password: '',
          firstName: '',
          middleName: input.middleName,
          lastName: '',
          suffix: input.suffix,
          contactNumber: input.contactNumber,
          relationship: input.relationship ?? 'guardian',
          occupation: input.occupation,
          address: input.address,
          childEmail: input.childEmail,
          childLrn: input.childLrn,
        },
        opts
      );
    case 'teacher':
      return registerTeacher(
        {
          email: '',
          password: '',
          firstName: '',
          middleName: input.middleName,
          lastName: '',
          suffix: input.suffix,
          contactNumber: input.contactNumber,
          employeeId: input.employeeId ?? '',
          department: input.department,
          dateHired: input.dateHired,
        },
        opts
      );
  }
}

export { PUBLIC_SELECT };
