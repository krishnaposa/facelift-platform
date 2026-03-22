import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { slugifyDisplayName } from '@/lib/catalog-slug';

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

    const existing = await prisma.catalogCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }

    const data: { name?: string; slug?: string } = {};

    if (typeof body?.name === 'string') {
      const name = body.name.trim();
      if (name.length > 0 && name.length <= 120) data.name = name;
    }

    if (typeof body?.slug === 'string' && body.slug.trim()) {
      data.slug = slugifyDisplayName(body.slug);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields.' }, { status: 400 });
    }

    if (data.name || data.slug) {
      const or: Array<{ name: string } | { slug: string }> = [];
      if (data.name) or.push({ name: data.name });
      if (data.slug) or.push({ slug: data.slug });
      const clash = await prisma.catalogCategory.findFirst({
        where: { id: { not: id }, OR: or },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: 'Another category already uses this name or slug.' },
          { status: 409 }
        );
      }
    }

    const category = await prisma.catalogCategory.update({
      where: { id },
      data,
      select: { id: true, name: true, slug: true, createdAt: true },
    });

    return NextResponse.json({ category });
  } catch (e) {
    console.error('Admin catalog category PATCH:', e);
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

    const count = await prisma.catalogItem.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `This category has ${count} catalog item(s). Remove or move them before deleting.` },
        { status: 409 }
      );
    }

    await prisma.catalogCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin catalog category DELETE:', e);
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  }
}
