import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import {
  catalogRowsToProjectItemCreateMany,
  type CatalogSelectionRow,
} from '@/lib/project-catalog-sync';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);

    if (!session || session.role !== 'HOMEOWNER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();

    const title = String(body?.title || '').trim();
    const zipCode = String(body?.zipCode || '').trim();
    const notes =
      typeof body?.notes === 'string'
        ? body.notes.trim()
        : typeof body?.selections?.notes === 'string'
          ? body.selections.notes.trim()
          : '';

    const photos: string[] = Array.isArray(body?.photos)
      ? body.photos.filter((p: unknown) => typeof p === 'string' && p.trim().length > 0)
      : Array.isArray(body?.selections?.photos)
        ? body.selections.photos.filter(
            (p: unknown) => typeof p === 'string' && p.trim().length > 0
          )
        : [];

    /** New wizard: top-level catalogItems */
    let rows: CatalogSelectionRow[] = Array.isArray(body?.catalogItems)
      ? (body.catalogItems as unknown[])
          .filter(
            (r): r is Record<string, unknown> =>
              !!r && typeof r === 'object' && typeof (r as { catalogItemId?: unknown }).catalogItemId === 'string'
          )
          .map((row) => ({
            catalogItemId: String(row.catalogItemId),
            quantity: typeof row.quantity === 'number' ? row.quantity : undefined,
            selectedOptions:
              row.selectedOptions && typeof row.selectedOptions === 'object' && !Array.isArray(row.selectedOptions)
                ? (row.selectedOptions as Record<string, unknown>)
                : undefined,
          }))
      : [];

    /** Legacy wizard: selections.items keyed by upgrade key + catalogSlugMap */
    if (rows.length === 0 && body?.selections?.items && typeof body.selections.items === 'object') {
      const catalogSlugMap = {
        frontDoor: 'front-door',
        bidets: 'bidets',
        cabinetRefacing: 'cabinet-refacing',
        spindles: 'spindles-and-railings',
        airVents: 'air-vents',
        countertops: 'countertops',
      } as const;

      type UpgradeKey = keyof typeof catalogSlugMap;
      const items = body.selections.items as Record<string, Record<string, unknown>>;
      const selectedEntries = Object.entries(items).filter(
        ([, value]) =>
          value &&
          typeof value === 'object' &&
          (value as { selected?: boolean }).selected
      ) as Array<[UpgradeKey, Record<string, unknown>]>;

      if (selectedEntries.length > 0) {
        const slugsNeeded = selectedEntries.map(([key]) => catalogSlugMap[key]);
        const found = await prisma.catalogItem.findMany({
          where: { slug: { in: slugsNeeded } },
          select: { id: true, slug: true },
        });
        const bySlug = new Map(found.map((c) => [c.slug, c.id]));
        rows = selectedEntries
          .map(([key, value]) => {
            const slug = catalogSlugMap[key];
            const catalogItemId = bySlug.get(slug);
            if (!catalogItemId) return null;
            const quantity =
              typeof value.count === 'number' &&
              Number.isFinite(value.count) &&
              value.count > 0
                ? value.count
                : 1;
            const { selected, count, ...rest } = value;
            return {
              catalogItemId,
              quantity,
              selectedOptions: rest,
            } satisfies CatalogSelectionRow;
          })
          .filter(Boolean) as CatalogSelectionRow[];
      }
    }

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

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one upgrade item.' },
        { status: 400 }
      );
    }

    const ids = [...new Set(rows.map((r) => r.catalogItemId).filter(Boolean))];
    const catalogRows = await prisma.catalogItem.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true },
    });
    const validIds = new Set(catalogRows.map((c) => c.id));
    for (const id of ids) {
      if (!validIds.has(id)) {
        return NextResponse.json(
          { error: `Invalid or inactive catalog item: ${id}` },
          { status: 400 }
        );
      }
    }

    const project = await prisma.project.create({
      data: {
        homeownerId: session.userId,
        title,
        description: notes || null,
        zipCode,
        status: 'OPEN',
      },
    });

    await prisma.projectItem.createMany({
      data: catalogRowsToProjectItemCreateMany(project.id, rows, notes),
    });

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