import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { buildNewProjectItemPayload } from '@/lib/project-item-defaults';
import { refreshProjectGalleryPicks } from '@/lib/project-gallery';

/**
 * Append one catalog upgrade to a project (homeowner-owned).
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);

    if (!session || session.role !== 'HOMEOWNER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const body = await req.json();
    const catalogItemId =
      typeof body?.catalogItemId === 'string' ? body.catalogItemId.trim() : '';

    if (!catalogItemId) {
      return NextResponse.json({ error: 'catalogItemId is required.' }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, homeownerId: session.userId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const catalogItem = await prisma.catalogItem.findFirst({
      where: { id: catalogItemId, active: true },
      select: { id: true, optionsSchema: true },
    });

    if (!catalogItem) {
      return NextResponse.json({ error: 'Catalog item not found.' }, { status: 404 });
    }

    const existing = await prisma.projectItem.findFirst({
      where: { projectId, catalogItemId },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { ok: true, alreadyAdded: true, projectItemId: existing.id },
        { status: 200 }
      );
    }

    const { quantity, selectedOptions } = buildNewProjectItemPayload(catalogItem.optionsSchema);

    const projectItem = await prisma.projectItem.create({
      data: {
        projectId,
        catalogItemId,
        quantity,
        selectedOptions,
        notes: null,
      },
    });

    try {
      await refreshProjectGalleryPicks(projectId);
    } catch (e) {
      console.warn('refreshProjectGalleryPicks:', e);
    }

    return NextResponse.json(
      { ok: true, alreadyAdded: false, projectItem: projectItem },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/projects/[id]/items:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add item.' },
      { status: 500 }
    );
  }
}
