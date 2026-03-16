import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { refreshProjectGalleryPicks } from '@/lib/project-gallery';

const catalogSlugMap = {
  frontDoor: 'front-door',
  bidets: 'bidets',
  cabinetRefacing: 'cabinet-refacing',
  spindles: 'spindles-and-railings',
  airVents: 'air-vents',
  countertops: 'countertops',
} as const;

type UpgradeKey = keyof typeof catalogSlugMap;

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
    const body = await req.json();

    const title = String(body?.title || '').trim();
    const zipCode = String(body?.zipCode || '').trim();
    const selections = body?.selections;

    if (!title) {
      return NextResponse.json(
        { error: 'Project title is required.' },
        { status: 400 }
      );
    }

    if (!zipCode) {
      return NextResponse.json(
        { error: 'Zip code is required.' },
        { status: 400 }
      );
    }

    if (!selections || typeof selections !== 'object') {
      return NextResponse.json(
        { error: 'Selections are required.' },
        { status: 400 }
      );
    }

    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        homeownerId: session.userId,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const items = selections?.items ?? {};
    const notes = typeof selections?.notes === 'string' ? selections.notes.trim() : '';
    const photos: string[] = Array.isArray(selections?.photos)
      ? selections.photos.filter((p: unknown) => typeof p === 'string' && p.trim().length > 0)
      : [];

    const selectedEntries = Object.entries(items).filter(
      ([, value]) =>
        value &&
        typeof value === 'object' &&
        (value as { selected?: boolean }).selected
    ) as Array<[UpgradeKey, Record<string, unknown>]>;

    if (selectedEntries.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one upgrade item.' },
        { status: 400 }
      );
    }

    const slugsNeeded = selectedEntries.map(([key]) => catalogSlugMap[key]);

    const catalogItems = await prisma.catalogItem.findMany({
      where: {
        slug: {
          in: slugsNeeded,
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });

    const catalogBySlug = new Map(catalogItems.map((item) => [item.slug, item.id]));

    for (const slug of slugsNeeded) {
      if (!catalogBySlug.has(slug)) {
        return NextResponse.json(
          { error: `Missing catalog item for slug: ${slug}` },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: {
          title,
          description: notes || null,
          zipCode,
        },
      });

      await tx.projectItem.deleteMany({
        where: { projectId: id },
      });

      await tx.projectPhoto.deleteMany({
        where: { projectId: id },
      });

      await tx.projectItem.createMany({
        data: selectedEntries.map(([key, value]) => {
          const slug = catalogSlugMap[key];
          const catalogItemId = catalogBySlug.get(slug)!;

          const quantity =
            typeof value.count === 'number' && Number.isFinite(value.count) && value.count > 0
              ? value.count
              : 1;

          const { selected, count, ...rest } = value;

          return {
            projectId: id,
            catalogItemId,
            quantity,
            selectedOptions: rest,
            notes: notes || null,
          };
        }),
      });

      if (photos.length > 0) {
        await tx.projectPhoto.createMany({
          data: photos.map((imageUrl, index) => ({
            projectId: id,
            imageUrl,
            sortOrder: index,
          })),
        });
      }
    });

    const updatedProject = await prisma.project.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            catalogItem: true,
          },
        },
        photos: true,
      },
    });

    // Refresh persisted AI gallery picks (best-effort).
    try {
      await refreshProjectGalleryPicks(id);
    } catch (error) {
      console.warn('Failed to refresh project gallery picks:', error);
    }

    return NextResponse.json({ project: updatedProject }, { status: 200 });
  } catch (error) {
    console.error('Update project error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update project.',
      },
      { status: 500 }
    );
  }
}