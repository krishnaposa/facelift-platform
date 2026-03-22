import { Prisma } from '@/generated/prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { slugifyDisplayName } from '@/lib/catalog-slug';

function parseOptionsSchema(raw: unknown): { ok: true; value: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined } | { ok: false; error: string } {
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }
  if (raw === null) {
    return { ok: true, value: Prisma.JsonNull };
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) {
      return { ok: true, value: Prisma.JsonNull };
    }
    try {
      const p = JSON.parse(t) as unknown;
      if (typeof p === 'object' && p !== null && !Array.isArray(p)) {
        return { ok: true, value: p as Prisma.InputJsonValue };
      }
      return { ok: false, error: 'optionsSchema must be a JSON object.' };
    } catch {
      return { ok: false, error: 'Invalid JSON in optionsSchema.' };
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return { ok: true, value: raw as Prisma.InputJsonValue };
  }
  return { ok: false, error: 'optionsSchema must be a JSON object or null.' };
}

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

    const existing = await prisma.catalogItem.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    const data: {
      categoryId?: string;
      name?: string;
      slug?: string;
      description?: string | null;
      unitLabel?: string | null;
      active?: boolean;
      optionsSchema?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    } = {};

    if (typeof body?.categoryId === 'string' && body.categoryId.trim()) {
      const cid = body.categoryId.trim();
      const c = await prisma.catalogCategory.findUnique({ where: { id: cid }, select: { id: true } });
      if (!c) {
        return NextResponse.json({ error: 'Category not found.' }, { status: 400 });
      }
      data.categoryId = cid;
    }

    if (typeof body?.name === 'string') {
      const name = body.name.trim();
      if (name.length > 0 && name.length <= 200) data.name = name;
    }

    if (typeof body?.slug === 'string' && body.slug.trim()) {
      data.slug = slugifyDisplayName(body.slug);
    }

    if (body?.description === null || typeof body?.description === 'string') {
      data.description =
        body.description === null
          ? null
          : String(body.description).trim().slice(0, 10_000) || null;
    }

    if (body?.unitLabel === null || typeof body?.unitLabel === 'string') {
      data.unitLabel =
        body.unitLabel === null || !String(body.unitLabel).trim()
          ? null
          : String(body.unitLabel).trim().slice(0, 64);
    }

    if (typeof body?.active === 'boolean') {
      data.active = body.active;
    }

    const schemaParsed = parseOptionsSchema(body?.optionsSchema);
    if (!schemaParsed.ok) {
      return NextResponse.json({ error: schemaParsed.error }, { status: 400 });
    }
    if (schemaParsed.value !== undefined) {
      data.optionsSchema = schemaParsed.value;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields.' }, { status: 400 });
    }

    if (data.slug) {
      const clash = await prisma.catalogItem.findFirst({
        where: { id: { not: id }, slug: data.slug },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json({ error: 'Another item already uses this slug.' }, { status: 409 });
      }
    }

    const item = await prisma.catalogItem.update({
      where: { id },
      data,
      select: {
        id: true,
        categoryId: true,
        name: true,
        slug: true,
        description: true,
        unitLabel: true,
        active: true,
        optionsSchema: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ item });
  } catch (e) {
    console.error('Admin catalog item PATCH:', e);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;

    const used = await prisma.projectItem.count({ where: { catalogItemId: id } });
    if (used > 0) {
      return NextResponse.json(
        {
          error: `This catalog item is used on ${used} project line(s). Remove those lines from projects before deleting.`,
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.galleryImage.updateMany({
        where: { catalogItemId: id },
        data: { catalogItemId: null },
      });
      await tx.catalogItem.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin catalog item DELETE:', e);
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  }
}
