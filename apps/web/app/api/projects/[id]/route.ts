import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { refreshProjectGalleryPicks } from '@/lib/project-gallery';
import {
  catalogRowsToProjectItemCreateMany,
  type CatalogSelectionRow,
} from '@/lib/project-catalog-sync';

const catalogSlugMap = {
  frontDoor: 'front-door',
  bidets: 'bidets',
  cabinetRefacing: 'cabinet-refacing',
  spindles: 'spindles-and-railings',
  airVents: 'air-vents',
  countertops: 'countertops',
} as const;

type UpgradeKey = keyof typeof catalogSlugMap;

function parseCatalogItemsBody(body: unknown): CatalogSelectionRow[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.catalogItems)) return [];
  return (b.catalogItems as unknown[])
    .filter(
      (r): r is Record<string, unknown> =>
        !!r && typeof r === 'object' && typeof (r as { catalogItemId?: unknown }).catalogItemId === 'string'
    )
    .map((row) => ({
      catalogItemId: String(row.catalogItemId),
      quantity: typeof row.quantity === 'number' ? row.quantity : undefined,
      selectedOptions:
        row.selectedOptions &&
        typeof row.selectedOptions === 'object' &&
        !Array.isArray(row.selectedOptions)
          ? (row.selectedOptions as Record<string, unknown>)
          : undefined,
      notes:
        typeof row.notes === 'string' && row.notes.trim()
          ? row.notes.trim().slice(0, 2000)
          : undefined,
    }));
}

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
    const notes =
      typeof body?.notes === 'string'
        ? body.notes.trim()
        : typeof body?.selections?.notes === 'string'
          ? body.selections.notes.trim()
          : '';

    let notesForContractors: string | null | undefined;
    if (Object.prototype.hasOwnProperty.call(body ?? {}, 'notesForContractors')) {
      const n = (body as { notesForContractors?: unknown }).notesForContractors;
      if (n !== null && n !== undefined && typeof n !== 'string') {
        return NextResponse.json({ error: 'Invalid notes for contractors.' }, { status: 400 });
      }
      notesForContractors =
        typeof n === 'string' ? n.trim().slice(0, 8000) || null : null;
    }

    const photos: string[] = Array.isArray(body?.photos)
      ? body.photos.filter((p: unknown) => typeof p === 'string' && p.trim().length > 0)
      : Array.isArray(body?.selections?.photos)
        ? body.selections.photos.filter(
            (p: unknown) => typeof p === 'string' && p.trim().length > 0
          )
        : [];

    /** New editor: dynamic catalogItems */
    let rows: CatalogSelectionRow[] = parseCatalogItemsBody(body);

    /** Legacy edit form: selections.items keyed by upgrade key */
    if (rows.length === 0 && body?.selections?.items && typeof body.selections.items === 'object') {
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

    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        homeownerId: session.userId,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const ids = [...new Set(rows.map((r) => r.catalogItemId).filter(Boolean))];
    const catalogRows = await prisma.catalogItem.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true },
    });
    const validIds = new Set(catalogRows.map((c) => c.id));
    for (const cid of ids) {
      if (!validIds.has(cid)) {
        return NextResponse.json(
          { error: `Invalid or inactive catalog item: ${cid}` },
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
          ...(notesForContractors !== undefined ? { notesForContractors } : {}),
        },
      });

      await tx.projectItem.deleteMany({
        where: { projectId: id },
      });

      await tx.projectPhoto.deleteMany({
        where: { projectId: id },
      });

      await tx.projectItem.createMany({
        data: catalogRowsToProjectItemCreateMany(id, rows),
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
