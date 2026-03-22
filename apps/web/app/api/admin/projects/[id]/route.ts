import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

const PROJECT_STATUSES = [
  'DRAFT',
  'OPEN',
  'IN_REVIEW',
  'AWARDED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const data: {
      title?: string;
      description?: string | null;
      zipCode?: string;
      status?: ProjectStatus;
      adminNotes?: string | null;
    } = {};

    if (typeof body?.title === 'string') {
      const t = body.title.trim();
      if (t.length > 0 && t.length <= 200) data.title = t;
    }

    if (body?.description === null || typeof body?.description === 'string') {
      data.description =
        body.description === null
          ? null
          : String(body.description).trim().slice(0, 20_000) || null;
    }

    if (typeof body?.zipCode === 'string') {
      const z = body.zipCode.trim();
      if (z.length > 0 && z.length <= 32) data.zipCode = z;
    }

    if (typeof body?.status === 'string' && PROJECT_STATUSES.includes(body.status as ProjectStatus)) {
      data.status = body.status as ProjectStatus;
    }

    if (body?.adminNotes === null || typeof body?.adminNotes === 'string') {
      data.adminNotes =
        body.adminNotes === null
          ? null
          : String(body.adminNotes).trim().slice(0, 20_000) || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        zipCode: true,
        status: true,
        adminNotes: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ project: updated });
  } catch (e) {
    console.error('Admin project PATCH:', e);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}
