/**
 * Landing page: load all catalog upgrade items with a correct thumbnail
 * (first public GalleryImage per item, else slug-based fallback image).
 */
import {
  emptyAvgInstallCost,
  getAverageBidLineAmountByCatalogItem,
  type AvgInstallCost,
} from '@/lib/catalog-install-cost';
import { IMAGE_PLACEHOLDER_DATA_URL } from '@/lib/image-placeholder';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export type { AvgInstallCost };

export type LandingCatalogItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryName: string;
  categorySlug: string;
  thumbnailUrl: string;
  subItems: string[];
  /** Typical $ from past contractor bid line items for this upgrade */
  avgInstallCost: AvgInstallCost;
};

/** When DB has no gallery row for this slug — curated Unsplash thumbs per upgrade type. */
const FALLBACK_THUMB_BY_SLUG: Record<string, string> = {
  'front-door':
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
  bidets:
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=80',
  'cabinet-refacing':
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
  countertops:
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
  'spindles-and-railings':
    'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=800&q=80',
  'air-vents':
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
  'paint-and-color-palette':
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
  'lighting-fixtures':
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d69?auto=format&fit=crop&w=800&q=80',
  'hardware-and-details':
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
  'kitchen-bathroom-refresh':
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80',
  flooring:
    'https://images.unsplash.com/photo-1581858726788-75bc0f298861?auto=format&fit=crop&w=800&q=80',
  'curb-appeal':
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
  'smart-lighting':
    'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80',
  'smart-thermostat':
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80',
  'home-security':
    'https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?auto=format&fit=crop&w=800&q=80',
  'modern-electrical':
    'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=800&q=80',
  'smart-shades':
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
  'insulation-windows':
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
  'energy-efficient-appliances':
    'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80',
};

/** When slug has no mapped Unsplash — inline SVG (always loads). */
const DEFAULT_FALLBACK = IMAGE_PLACEHOLDER_DATA_URL;

/** Public thumbnail URL: DB image first, else slug-based Unsplash. */
export function resolveCatalogThumbnail(
  slug: string,
  galleryImageUrl?: string | null
): string {
  if (galleryImageUrl) return galleryImageUrl;
  return FALLBACK_THUMB_BY_SLUG[slug] ?? DEFAULT_FALLBACK;
}

export function optionsSchemaToSubItems(schema: unknown): string[] {
  if (!schema || typeof schema !== 'object') {
    return ['Choose options', 'Get contractor bids', 'Track your project'];
  }
  const lines: string[] = [];
  for (const [key, val] of Object.entries(schema as Record<string, unknown>)) {
    const label = key.replace(/_/g, ' ');
    if (Array.isArray(val)) {
      lines.push(`${label}: ${val.map(String).join(', ')}`);
    } else if (typeof val === 'string') {
      lines.push(`${label} (${val})`);
    }
  }
  return lines.length > 0 ? lines.slice(0, 4) : ['Choose options', 'Get contractor bids', 'Track your project'];
}

export async function getCatalogItemsForLanding(): Promise<LandingCatalogItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }
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
      const thumb = resolveCatalogThumbnail(item.slug, item.galleryImages[0]?.imageUrl);
      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        categoryName: item.category.name,
        categorySlug: item.category.slug,
        thumbnailUrl: thumb,
        subItems: optionsSchemaToSubItems(item.optionsSchema),
        avgInstallCost: avgById.get(item.id) ?? emptyAvgInstallCost(),
      };
    });
  } catch (err) {
    console.error('[getCatalogItemsForLanding]', err);
    return [];
  }
}
