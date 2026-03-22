import { Prisma } from '@/generated/prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { slugifyDisplayName } from '@/lib/catalog-slug';

function parseOptionsSchema(raw: unknown): { ok: true; value: Prisma.InputJsonValue | typeof Prisma.JsonNull } | { ok: false; error: string } {
  if (raw === null || raw === undefined) {
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

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = await req.json();
    const categoryId = typeof body?.categoryId === 'string' ? body.categoryId.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!categoryId || !name || name.length > 200) {
      return NextResponse.json(
        { error: 'categoryId and name are required (name max 200 chars).' },
        { status: 400 }
      );
    }

    const cat = await prisma.catalogCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!cat) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 400 });
    }

    let slug =
      typeof body?.slug === 'string' && body.slug.trim()
        ? slugifyDisplayName(body.slug)
        : slugifyDisplayName(name);

    if (!slug) {
      return NextResponse.json({ error: 'Could not derive slug.' }, { status: 400 });
    }

    const slugTaken = await prisma.catalogItem.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (slugTaken) {
      return NextResponse.json({ error: 'An item with this slug already exists.' }, { status: 409 });
    }

    const description =
      body?.description === null || body?.description === undefined
        ? null
        : typeof body.description === 'string'
          ? body.description.trim().slice(0, 10_000) || null
          : null;

    const unitLabel =
      typeof body?.unitLabel === 'string' && body.unitLabel.trim()
        ? body.unitLabel.trim().slice(0, 64)
        : null;

    const active = typeof body?.active === 'boolean' ? body.active : true;

    const schemaParsed = parseOptionsSchema(body?.optionsSchema);
    if (!schemaParsed.ok) {
      return NextResponse.json({ error: schemaParsed.error }, { status: 400 });
    }

    const item = await prisma.catalogItem.create({
      data: {
        categoryId,
        name,
        slug,
        description,
        unitLabel,
        active,
        optionsSchema: schemaParsed.value,
      },
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
    console.error('Admin catalog item POST:', e);
    return NextResponse.json({ error: 'Create failed.' }, { status: 500 });
  }
}
