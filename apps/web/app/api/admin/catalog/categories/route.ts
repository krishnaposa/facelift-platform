import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { slugifyDisplayName } from '@/lib/catalog-slug';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 120) {
      return NextResponse.json({ error: 'Valid name is required (max 120 chars).' }, { status: 400 });
    }

    let slug =
      typeof body?.slug === 'string' && body.slug.trim()
        ? slugifyDisplayName(body.slug)
        : slugifyDisplayName(name);

    if (!slug) {
      return NextResponse.json({ error: 'Could not derive slug.' }, { status: 400 });
    }

    const existing = await prisma.catalogCategory.findFirst({
      where: { OR: [{ slug }, { name }] },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A category with this name or slug already exists.' },
        { status: 409 }
      );
    }

    const category = await prisma.catalogCategory.create({
      data: { name, slug },
      select: { id: true, name: true, slug: true, createdAt: true },
    });

    return NextResponse.json({ category });
  } catch (e) {
    console.error('Admin catalog category POST:', e);
    return NextResponse.json({ error: 'Create failed.' }, { status: 500 });
  }
}
