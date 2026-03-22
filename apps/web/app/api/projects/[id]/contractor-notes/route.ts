import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

const MAX_LEN = 8000;

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'HOMEOWNER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || !('notesForContractors' in body)) {
      return NextResponse.json({ error: 'notesForContractors is required.' }, { status: 400 });
    }

    const raw = (body as { notesForContractors?: unknown }).notesForContractors;
    if (raw !== null && typeof raw !== 'string') {
      return NextResponse.json({ error: 'Invalid notes field.' }, { status: 400 });
    }

    const notesForContractors =
      raw === null ? null : raw.trim().slice(0, MAX_LEN) || null;

    const updated = await prisma.project.updateMany({
      where: { id, homeownerId: session.userId },
      data: { notesForContractors },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH contractor-notes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save notes.' },
      { status: 500 }
    );
  }
}
