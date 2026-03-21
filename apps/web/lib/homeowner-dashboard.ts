import type { AvgInstallCost } from '@/lib/catalog-install-cost';
import { emptyAvgInstallCost } from '@/lib/catalog-install-cost';
import { resolveCatalogThumbnail } from '@/lib/catalog-landing';

export type EnrichedCatalogItem = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  categoryName: string;
  thumbnailUrl: string;
  avgInstall: AvgInstallCost;
};

/**
 * Build thumbnail + avg for all active catalog items (for suggestions).
 */
export function enrichCatalogForDashboard(
  rows: Array<{
    id: string;
    categoryId: string;
    name: string;
    slug: string;
    description: string | null;
    category: { name: string };
    galleryImages: { imageUrl: string }[];
  }>,
  avgById: Map<string, AvgInstallCost>
): EnrichedCatalogItem[] {
  return rows.map((c) => ({
    id: c.id,
    categoryId: c.categoryId,
    name: c.name,
    slug: c.slug,
    description: c.description,
    categoryName: c.category.name,
    thumbnailUrl: resolveCatalogThumbnail(c.slug, c.galleryImages[0]?.imageUrl),
    avgInstall: avgById.get(c.id) ?? emptyAvgInstallCost(),
  }));
}

/**
 * Suggest upgrades not yet in the project: same category first, then rest of catalog.
 */
export function pickSuggestedCatalogItems(
  selectedCatalogIds: Set<string>,
  enriched: EnrichedCatalogItem[],
  limit = 5
): EnrichedCatalogItem[] {
  const selectedCategoryIds = new Set(
    enriched.filter((c) => selectedCatalogIds.has(c.id)).map((c) => c.categoryId)
  );
  const candidates = enriched.filter((c) => !selectedCatalogIds.has(c.id));
  const sameCategory = candidates.filter((c) => selectedCategoryIds.has(c.categoryId));
  const other = candidates.filter((c) => !selectedCategoryIds.has(c.categoryId));
  return [...sameCategory, ...other].slice(0, limit);
}

export function formatSelectedOptions(opts: unknown): string {
  if (opts == null || typeof opts !== 'object') return '';
  const o = opts as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length === 0) return '';
  return keys
    .map((k) => {
      const v = o[k];
      const val =
        typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
          ? String(v)
          : JSON.stringify(v);
      return `${k.replace(/_/g, ' ')}: ${val}`;
    })
    .join(' · ');
}

/** Sum of (avg line-item $ × quantity) for items that have bid history. */
export function estimateProjectFromLineItemAverages(
  items: Array<{ quantity: number; catalogItemId: string }>,
  avgById: Map<string, AvgInstallCost>
): { sum: number; linesWithData: number } {
  let sum = 0;
  let linesWithData = 0;
  for (const it of items) {
    const avg = avgById.get(it.catalogItemId);
    if (!avg?.hasData || avg.average == null) continue;
    sum += avg.average * it.quantity;
    linesWithData += 1;
  }
  return { sum, linesWithData };
}
