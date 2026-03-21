/**
 * Homeowner project wizard: full catalog with thumbnails + avg bid line-item cost per upgrade.
 */
import { prisma } from '@/lib/prisma';
import {
  emptyAvgInstallCost,
  getAverageBidLineAmountByCatalogItem,
  type AvgInstallCost,
} from '@/lib/catalog-install-cost';
import { optionsSchemaToSubItems, resolveCatalogThumbnail } from '@/lib/catalog-landing';

export type { AvgInstallCost };

export type WizardCatalogItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unitLabel: string | null;
  categoryName: string;
  categorySlug: string;
  /** Hero image (gallery or fallback) */
  thumbnailUrl: string;
  /** Preview lines derived from options schema */
  subItems: string[];
  /** Raw JSON for dynamic option controls */
  optionsSchema: unknown;
  avgInstallCost: AvgInstallCost;
};

export async function getCatalogForWizard(): Promise<WizardCatalogItem[]> {
  try {
    const [items, avgById] = await Promise.all([
      prisma.catalogItem.findMany({
        where: { active: true },
        include: {
          category: true,
          galleryImages: {
            where: { isPublic: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { imageUrl: true },
          },
        },
        orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      }),
      getAverageBidLineAmountByCatalogItem(),
    ]);

    return items.map((item) => {
      const primary = item.galleryImages[0]?.imageUrl;
      const thumb = resolveCatalogThumbnail(item.slug, primary);
      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        unitLabel: item.unitLabel,
        categoryName: item.category.name,
        categorySlug: item.category.slug,
        thumbnailUrl: thumb,
        subItems: optionsSchemaToSubItems(item.optionsSchema),
        optionsSchema: item.optionsSchema,
        avgInstallCost: avgById.get(item.id) ?? emptyAvgInstallCost(),
      };
    });
  } catch (err) {
    console.error('[getCatalogForWizard]', err);
    return [];
  }
}
