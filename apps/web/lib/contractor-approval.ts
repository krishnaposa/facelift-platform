import { prisma } from '@/lib/prisma';

/** Returns an error message if bidding/messaging is not allowed, otherwise null. */
export async function contractorApprovalBlockReason(
  contractorUserId: string
): Promise<string | null> {
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: contractorUserId },
    select: { approvalStatus: true },
  });

  if (!profile) {
    return 'No contractor profile found.';
  }

  if (profile.approvalStatus === 'APPROVED') {
    return null;
  }

  if (profile.approvalStatus === 'PENDING') {
    return 'Your account is pending approval. You can browse projects, but bidding and messaging are disabled until an administrator approves your company.';
  }

  if (profile.approvalStatus === 'REJECTED') {
    return 'Your contractor application was not approved. Contact support if you believe this is a mistake.';
  }

  return 'Your contractor account is suspended. Bidding and messaging are disabled.';
}
