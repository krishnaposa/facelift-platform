import CatalogAdminClient from '@/app/dashboard/admin/catalog/CatalogAdminClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminCatalogPage() {
  const [categories, items] = await Promise.all([
    prisma.catalogCategory.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, createdAt: true },
    }),
    prisma.catalogItem.findMany({
      include: {
        category: { select: { name: true, slug: true } },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    }),
  ]);

  const catRows = categories.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

  const itemRows = items.map((i) => ({
    id: i.id,
    categoryId: i.categoryId,
    name: i.name,
    slug: i.slug,
    description: i.description,
    unitLabel: i.unitLabel,
    active: i.active,
    optionsSchema: i.optionsSchema,
    category: i.category,
  }));

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Catalog</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Manage categories and upgrade line items. Changes apply to new projects and wizard flows; existing
        project lines keep their stored catalog item IDs until edited.
      </p>
      <div className="mt-10">
        <CatalogAdminClient categories={catRows} items={itemRows} />
      </div>
    </div>
  );
}
