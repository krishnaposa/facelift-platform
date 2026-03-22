import { prisma } from '@/lib/prisma';

export type DeleteUserResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Hard-delete a user and dependent rows that would block FK constraints.
 * Profiles and user gallery picks cascade from User in the schema.
 */
export async function deleteUserAsAdmin(params: {
  actorUserId: string;
  targetUserId: string;
}): Promise<DeleteUserResult> {
  const { actorUserId, targetUserId } = params;

  if (targetUserId === actorUserId) {
    return { ok: false, error: 'You cannot delete your own account from the admin panel.' };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, email: true },
  });

  if (!target) {
    return { ok: false, error: 'User not found.' };
  }

  if (target.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return { ok: false, error: 'Cannot delete the last admin account.' };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.bid.deleteMany({ where: { contractorId: targetUserId } });
    await tx.projectContractorMessage.deleteMany({ where: { contractorId: targetUserId } });
    await tx.project.deleteMany({ where: { homeownerId: targetUserId } });
    await tx.user.delete({ where: { id: targetUserId } });
  });

  return { ok: true };
}
