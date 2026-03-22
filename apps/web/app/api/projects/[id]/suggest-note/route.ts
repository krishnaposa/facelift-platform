import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { contractorApprovalBlockReason } from '@/lib/contractor-approval';
import {
  suggestNote,
  type ContractorNoteIntent,
  type NoteAssistantRole,
} from '@/lib/note-assistant';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const body = await req.json().catch(() => null);
    const role: NoteAssistantRole = body?.role === 'contractor' ? 'contractor' : 'homeowner';

    const project = await prisma.project.findFirst({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        description: true,
        zipCode: true,
        status: true,
        homeownerId: true,
        items: {
          select: {
            id: true,
            catalogItem: { select: { name: true } },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    if (role === 'homeowner') {
      if (session.userId !== project.homeownerId) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
      }
    } else {
      if (session.role !== 'CONTRACTOR') {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
      }
      if (project.status !== 'OPEN') {
        return NextResponse.json({ error: 'Project is not open for contractor messaging.' }, { status: 403 });
      }
      const approvalErr = await contractorApprovalBlockReason(session.userId);
      if (approvalErr) {
        return NextResponse.json({ error: approvalErr }, { status: 403 });
      }
    }

    const itemRaw = body?.projectItemId;
    let projectItemName: string | null = null;
    if (itemRaw != null && itemRaw !== '') {
      if (typeof itemRaw !== 'string') {
        return NextResponse.json({ error: 'Invalid line item reference.' }, { status: 400 });
      }
      const match = project.items.find((i) => i.id === itemRaw);
      if (!match) {
        return NextResponse.json({ error: 'That line item is not on this project.' }, { status: 400 });
      }
      projectItemName = match.catalogItem.name;
    }

    const draft = typeof body?.draft === 'string' ? body.draft : null;

    let contractorIntent: ContractorNoteIntent | undefined;
    if (role === 'contractor') {
      contractorIntent =
        body?.contractorIntent === 'cover_letter' ? 'cover_letter' : 'clarify';
    }

    const suggested = await suggestNote({
      role,
      projectTitle: project.title,
      projectDescription: project.description,
      zipCode: project.zipCode,
      upgradeNames: project.items.map((i) => i.catalogItem.name),
      projectItemName,
      draft,
      contractorIntent,
    });

    return NextResponse.json({ suggested });
  } catch (error) {
    console.error('POST suggest-note:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to suggest note.' },
      { status: 500 }
    );
  }
}
