import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { contractorApprovalBlockReason } from '@/lib/contractor-approval';

function parseMoney(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === 'string' && value.trim()) {
    const n = parseFloat(value.replace(/,/g, ''));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  }
  return null;
}

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
      return NextResponse.json({ error: 'Project not found or not open for bids.' }, { status: 404 });
    }

    const allowedItemIds = new Set(project.items.map((i) => i.id));

    const body = await req.json();
    const daysRaw = body?.daysToComplete;
    const daysToComplete =
      typeof daysRaw === 'number' && Number.isInteger(daysRaw) && daysRaw > 0 && daysRaw <= 3650
        ? daysRaw
        : typeof daysRaw === 'string' && /^\d+$/.test(daysRaw)
          ? Math.min(3650, Math.max(1, parseInt(daysRaw, 10)))
          : null;

    if (daysToComplete == null) {
      return NextResponse.json(
        { error: 'daysToComplete must be a whole number between 1 and 3650.' },
        { status: 400 }
      );
    }

    const messageRaw = body?.message;
    const message =
      typeof messageRaw === 'string' && messageRaw.trim()
        ? messageRaw.trim().slice(0, 4000)
        : null;

    const linesIn = Array.isArray(body?.lineItems) ? body.lineItems : [];

    type ParsedLine = { amount: number; note: string | null };
    const byItem = new Map<string, ParsedLine>();

    for (const row of linesIn) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const projectItemId = typeof r.projectItemId === 'string' ? r.projectItemId : '';
      if (!projectItemId || !allowedItemIds.has(projectItemId)) {
        return NextResponse.json({ error: 'Invalid line item in bid.' }, { status: 400 });
      }
      const amount = parseMoney(r.amount);
      if (amount == null || amount < 0) {
        return NextResponse.json({ error: 'Each amount must be a valid dollar value (0 or more).' }, { status: 400 });
      }
      const note =
        typeof r.note === 'string' && r.note.trim() ? r.note.trim().slice(0, 2000) : null;
      byItem.set(projectItemId, { amount, note });
    }

    const lineCreates = project.items.map((item) => {
      const line = byItem.get(item.id);
      return {
        projectItemId: item.id,
        amount: (line?.amount ?? 0).toFixed(2),
        note: line?.note ?? null,
      };
    });

    const hasPositive = lineCreates.some((c) => parseFloat(c.amount) > 0);
    if (!hasPositive) {
      return NextResponse.json(
        { error: 'Enter a price greater than $0 on at least one line item.' },
        { status: 400 }
      );
    }

    let total = 0;
    for (const c of lineCreates) {
      total += parseFloat(c.amount);
    }
    total = Math.round(total * 100) / 100;

    const existing = await prisma.bid.findUnique({
      where: {
        projectId_contractorId: {
          projectId,
          contractorId: session.userId,
        },
      },
      select: { id: true, status: true },
    });

    if (existing?.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'This bid was accepted and cannot be changed here.' },
        { status: 409 }
      );
    }

    const bid = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.bidLineItem.deleteMany({ where: { bidId: existing.id } });
        return tx.bid.update({
          where: { id: existing.id },
          data: {
            amount: total.toFixed(2),
            daysToComplete,
            message,
            status: 'SUBMITTED',
            lineItems: {
              create: lineCreates.map((c) => ({
                projectItemId: c.projectItemId,
                amount: c.amount,
                note: c.note,
              })),
            },
          },
          include: { lineItems: true },
        });
      }

      return tx.bid.create({
        data: {
          projectId,
          contractorId: session.userId,
          amount: total.toFixed(2),
          daysToComplete,
          message,
          status: 'SUBMITTED',
          lineItems: {
            create: lineCreates.map((c) => ({
              projectItemId: c.projectItemId,
              amount: c.amount,
              note: c.note,
            })),
          },
        },
        include: { lineItems: true },
      });
    });

    return NextResponse.json({
      bid: {
        id: bid.id,
        amount: Number(bid.amount),
        daysToComplete: bid.daysToComplete,
        message: bid.message,
        status: bid.status,
        lineItems: bid.lineItems.map((li) => ({
          projectItemId: li.projectItemId,
          amount: Number(li.amount),
          note: li.note,
        })),
      },
    });
  } catch (e) {
    console.error('Contractor bid POST:', e);
    return NextResponse.json({ error: 'Failed to save bid.' }, { status: 500 });
  }
}
