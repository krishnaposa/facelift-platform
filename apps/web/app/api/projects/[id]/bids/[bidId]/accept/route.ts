import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { sendBidAcceptedEmailToContractor } from '@/lib/email';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; bidId: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'HOMEOWNER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id: projectId, bidId } = await context.params;
    const origin = new URL(req.url).origin;

    const result = await prisma.$transaction(
      async (tx) => {
        const project = await tx.project.findFirst({
          where: {
            id: projectId,
            homeownerId: session.userId,
            status: 'OPEN',
          },
          select: { id: true, title: true },
        });

        if (!project) {
          throw new Error('PROJECT_NOT_OPEN');
        }

        const bid = await tx.bid.findFirst({
          where: {
            id: bidId,
            projectId,
            status: { in: ['SUBMITTED', 'SHORTLISTED'] },
          },
          include: {
            contractor: { select: { email: true } },
          },
        });

        if (!bid) {
          throw new Error('BID_INVALID');
        }

        await tx.bid.updateMany({
          where: {
            projectId,
            id: { not: bidId },
            status: { in: ['SUBMITTED', 'SHORTLISTED'] },
          },
          data: { status: 'REJECTED' },
        });

        await tx.bid.update({
          where: { id: bidId },
          data: { status: 'ACCEPTED' },
        });

        const awarded = await tx.project.updateMany({
          where: { id: projectId, status: 'OPEN' },
          data: { status: 'AWARDED' },
        });

        if (awarded.count !== 1) {
          throw new Error('CONFLICT');
        }

        return {
          project,
          bid: {
            id: bid.id,
            amount: Number(bid.amount),
            daysToComplete: bid.daysToComplete,
            contractorEmail: bid.contractor.email,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    const emailResult = await sendBidAcceptedEmailToContractor({
      to: result.bid.contractorEmail,
      projectTitle: result.project.title,
      bidAmount: result.bid.amount,
      daysToComplete: result.bid.daysToComplete,
      appOrigin: origin,
    });

    return NextResponse.json({
      ok: true,
      projectId: result.project.id,
      bidId: result.bid.id,
      emailSent: emailResult.sent,
      emailError: emailResult.error,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'PROJECT_NOT_OPEN') {
      return NextResponse.json(
        { error: 'Project is not open for awarding, or you do not have access.' },
        { status: 409 }
      );
    }
    if (msg === 'BID_INVALID') {
      return NextResponse.json(
        { error: 'Bid not found or cannot be accepted (it may already be decided).' },
        { status: 400 }
      );
    }
    if (msg === 'CONFLICT') {
      return NextResponse.json(
        { error: 'Could not award this project. Please refresh and try again.' },
        { status: 409 }
      );
    }
    console.error('Accept bid error:', e);
    return NextResponse.json({ error: 'Failed to accept bid.' }, { status: 500 });
  }
}
