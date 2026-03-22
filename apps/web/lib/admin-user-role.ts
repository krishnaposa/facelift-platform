import { encryptCompanyName } from '@/lib/contractor-company-name';
import { prisma } from '@/lib/prisma';
import type { SessionRole } from '@/lib/auth-routing';

const ROLES: SessionRole[] = ['HOMEOWNER', 'CONTRACTOR', 'ADMIN'];

export function isUserRole(value: unknown): value is SessionRole {
  return typeof value === 'string' && ROLES.includes(value as SessionRole);
}

/**
 * Updates a user's role (admin-only caller). Ensures contractor profile exists when role is CONTRACTOR.
 * Blocks removing the last platform admin.
 */
export async function applyUserRoleUpdate(params: {
  actorUserId: string;
  targetUserId: string;
  newRole: SessionRole;
}) {
  const { actorUserId, targetUserId, newRole } = params;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, email: true },
  });

  if (!target) {
    return { ok: false as const, error: 'User not found.' };
  }

  if (target.role === newRole) {
    return { ok: true as const, user: { ...target, role: newRole } };
  }

  if (target.role === 'ADMIN' && newRole !== 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return {
        ok: false as const,
        error: 'Cannot demote the last admin. Promote another admin first.',
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    if (newRole === 'CONTRACTOR') {
      await tx.contractorProfile.upsert({
        where: { userId: targetUserId },
        create: {
          userId: targetUserId,
          companyName: null,
          companyNameEncrypted: encryptCompanyName('Company (update in profile)'),
          serviceZipCodes: [],
        },
        update: {},
      });
    }
  });

  return {
    ok: true as const,
    user: { id: target.id, email: target.email, role: newRole },
  };
}
