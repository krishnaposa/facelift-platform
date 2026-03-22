import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { contractorApprovalBlockReason } from '@/lib/contractor-approval';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);

    if (!session || session.role !== 'CONTRACTOR') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const approvalErr = await contractorApprovalBlockReason(session.userId);
    if (approvalErr) {
      return NextResponse.json({ error: approvalErr }, { status: 403 });
    }

    const { id: projectId } = await context.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, status: 'OPEN' },
      select: { id: true, items: { select: { id: true } } },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or not open.' }, { status: 404 });
    }

    const body = await req.json();
    const text = typeof body?.body === 'string' ? body.body.trim() : '';

    if (text.length < 3) {
      return NextResponse.json({ error: 'Message must be at least a few characters.' }, { status: 400 });
    }

    if (text.length > 8000) {
      return NextResponse.json({ error: 'Message is too long.' }, { status: 400 });
    }

    const itemRaw = body?.projectItemId;
    let projectItemId: string | null = null;

    if (itemRaw != null && itemRaw !== '') {
      if (typeof itemRaw !== 'string') {
        return NextResponse.json({ error: 'Invalid line item reference.' }, { status: 400 });
      }
      const ok = project.items.some((i) => i.id === itemRaw);
      if (!ok) {
        return NextResponse.json({ error: 'That line item is not on this project.' }, { status: 400 });
      }
      projectItemId = itemRaw;
    }

    const msg = await prisma.projectContractorMessage.create({
      data: {
        projectId,
        contractorId: session.userId,
        projectItemId,
        body: text,
      },
    });

    return NextResponse.json({
      message: {
        id: msg.id,
        projectItemId: msg.projectItemId,
        createdAt: msg.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error('Contractor message POST:', e);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}
