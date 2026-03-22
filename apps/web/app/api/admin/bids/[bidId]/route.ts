import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

const BID_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'WITHDRAWN',
  'SHORTLISTED',
  'ACCEPTED',
  'REJECTED',
] as const;
type BidStatus = (typeof BID_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ bidId: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { bidId } = await context.params;
    const body = await req.json();
    const next = body?.status as string | undefined;

    if (!next || !BID_STATUSES.includes(next as BidStatus)) {
      return NextResponse.json({ error: 'Invalid bid status.' }, { status: 400 });
    }

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      select: { id: true },
    });

    if (!bid) {
      return NextResponse.json({ error: 'Bid not found.' }, { status: 404 });
    }

    const updated = await prisma.bid.update({
      where: { id: bidId },
      data: { status: next as BidStatus },
      select: {
        id: true,
        status: true,
        amount: true,
        projectId: true,
        contractorId: true,
      },
    });

    return NextResponse.json({
      bid: {
        ...updated,
        amount: Number(updated.amount),
      },
    });
  } catch (e) {
    console.error('Admin bid PATCH:', e);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}
