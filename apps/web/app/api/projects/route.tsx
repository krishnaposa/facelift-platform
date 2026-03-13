import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TEMP_HOMEOWNER_ID = '11111111-1111-1111-1111-111111111111';

const catalogSlugMap = {
  frontDoor: 'front-door',
  bidets: 'bidets',
  cabinetRefacing: 'cabinet-refacing',
  spindles: 'spindles-and-railings',
  airVents: 'air-vents',
  countertops: 'countertops',
} as const;

type UpgradeKey = keyof typeof catalogSlugMap;

export async function POST(req: NextRequest) {
  try {
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

    const homeowner = await prisma.user.findUnique({
      where: { id: TEMP_HOMEOWNER_ID },
    });

    if (!homeowner) {
      return NextResponse.json(
        { error: `Test homeowner not found for id ${TEMP_HOMEOWNER_ID}` },
        { status: 400 }
      );
    }

    const items = selections?.items ?? {};
    const notes = typeof selections?.notes === 'string' ? selections.notes.trim() : '';
    const photos: string[] = Array.isArray(selections?.photos)
      ? selections.photos.filter((p: unknown) => typeof p === 'string' && p.trim().length > 0)
      : [];

    const selectedEntries = Object.entries(items).filter(
      ([, value]) => value && typeof value === 'object' && (value as { selected?: boolean }).selected
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

    const project = await prisma.project.create({
      data: {
        homeownerId: TEMP_HOMEOWNER_ID,
        title,
        description: notes || null,
        zipCode,
        status: 'OPEN',
      },
    });

    if (selectedEntries.length > 0) {
      await prisma.projectItem.createMany({
        data: selectedEntries.map(([key, value]) => {
          const slug = catalogSlugMap[key];
          const catalogItemId = catalogBySlug.get(slug)!;

          const quantity =
            typeof value.count === 'number' && Number.isFinite(value.count) && value.count > 0
              ? value.count
              : 1;

          const { selected, count, ...rest } = value;

          return {
            projectId: project.id,
            catalogItemId,
            quantity,
            selectedOptions: rest,
            notes: notes || null,
          };
        }),
      });
    }

    if (photos.length > 0) {
      await prisma.projectPhoto.createMany({
        data: photos.map((imageUrl, index) => ({
          projectId: project.id,
          imageUrl,
          sortOrder: index,
        })),
      });
    }

    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        items: {
          include: {
            catalogItem: true,
          },
        },
        photos: true,
      },
    });

    return NextResponse.json({ project: fullProject }, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create project.',
      },
      { status: 500 }
    );
  }
}