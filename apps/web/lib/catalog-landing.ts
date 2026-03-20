/**
 * Landing page: load all catalog upgrade items with a correct thumbnail
 * (first public GalleryImage per item, else slug-based fallback image).
 */
import { prisma } from '@/lib/prisma';

export type LandingCatalogItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryName: string;
  categorySlug: string;
  thumbnailUrl: string;
  subItems: string[];
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
};

const DEFAULT_FALLBACK =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';

function optionsSchemaToSubItems(schema: unknown): string[] {
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
  try {
    const items = await prisma.catalogItem.findMany({
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
    });

    return items.map((item) => {
      const fromDb = item.galleryImages[0]?.imageUrl;
      const thumb = fromDb ?? FALLBACK_THUMB_BY_SLUG[item.slug] ?? DEFAULT_FALLBACK;
      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        categoryName: item.category.name,
        categorySlug: item.category.slug,
        thumbnailUrl: thumb,
        subItems: optionsSchemaToSubItems(item.optionsSchema),
      };
    });
  } catch (err) {
    console.error('[getCatalogItemsForLanding]', err);
    return [];
  }
}
