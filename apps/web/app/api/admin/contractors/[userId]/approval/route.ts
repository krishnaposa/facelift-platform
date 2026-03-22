import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
const ALLOWED = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const;
type Approval = (typeof ALLOWED)[number];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { userId } = await context.params;
    const body = await req.json();
    const next = body?.approvalStatus as string | undefined;

    if (!next || !ALLOWED.includes(next as Approval)) {
      return NextResponse.json({ error: 'Invalid approval status.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, contractorProfile: { select: { id: true } } },
    });

    if (!user || user.role !== 'CONTRACTOR' || !user.contractorProfile) {
      return NextResponse.json({ error: 'Not a contractor account.' }, { status: 404 });
    }

    await prisma.contractorProfile.update({
      where: { userId },
      data: { approvalStatus: next as Approval },
    });

    return NextResponse.json({ ok: true, approvalStatus: next });
  } catch (e) {
    console.error('Admin contractor approval:', e);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}
