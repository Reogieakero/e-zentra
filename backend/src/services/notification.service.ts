import { NotificationType, Prisma, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export interface NotificationInput {
  recipientId: string;
  sourceTable: string;
  sourceRecordId: string;
  notificationType: NotificationType;
  title: string;
  message: string;
}

export async function notify(input: NotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        sourceTable: input.sourceTable,
        sourceRecordId: input.sourceRecordId,
        notificationType: input.notificationType,
        title: input.title,
        message: input.message,
      },
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to enqueue notification');
  }
}

export async function getConfirmedParentsOfStudent(studentId: string): Promise<Pick<User, 'id'>[]> {
  return prisma.user.findMany({
    where: {
      parentLinks: {
        some: { studentId, status: 'confirmed' },
      },
    },
    select: { id: true },
  });
}

export async function notifyStudentAndParents(
  studentId: string,
  base: Omit<NotificationInput, 'recipientId'> & { notifyParents?: boolean }
): Promise<void> {
  const { notifyParents = true, ...rest } = base;
  await notify({ ...rest, recipientId: studentId });
  if (notifyParents) {
    const parents = await getConfirmedParentsOfStudent(studentId);
    for (const parent of parents) {
      await notify({ ...rest, recipientId: parent.id });
    }
  }
}

export async function notifyParentsOfStudent(
  studentId: string,
  rest: Omit<NotificationInput, 'recipientId'>
): Promise<void> {
  const parents = await getConfirmedParentsOfStudent(studentId);
  for (const parent of parents) {
    await notify({ ...rest, recipientId: parent.id });
  }
}

export type NotificationCreateInput = Prisma.NotificationUncheckedCreateInput;
