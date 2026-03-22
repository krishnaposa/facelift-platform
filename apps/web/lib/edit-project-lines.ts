import { schemaUsesCountField } from '@/lib/catalog-selection';
import { resolveCatalogThumbnail } from '@/lib/catalog-landing';
import type { EditFormLine } from '@/lib/edit-project-types';

export type { AddableCatalogEntry, EditFormLine } from '@/lib/edit-project-types';

/** Build client form state from Prisma project items (same catalog as project view). */
export function projectItemsToEditLines(
  items: Array<{
    id: string;
    catalogItemId: string;
    quantity: number;
    notes: string | null;
    selectedOptions: unknown;
    catalogItem: {
      name: string;
      slug: string;
      description: string | null;
      unitLabel: string | null;
      optionsSchema: unknown;
      category: { name: string };
      galleryImages: { imageUrl: string }[];
    };
  }>
): EditFormLine[] {
  return items.map((item) => {
    const schema = item.catalogItem.optionsSchema;
    const raw =
      item.selectedOptions &&
      typeof item.selectedOptions === 'object' &&
      !Array.isArray(item.selectedOptions)
        ? { ...(item.selectedOptions as Record<string, unknown>) }
        : {};

    const options: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'number' || typeof v === 'string') {
        options[k] = v as string | number;
      }
    }
    if (schemaUsesCountField(schema)) {
      options.count = item.quantity;
    }

    return {
      key: item.id,
      catalogItemId: item.catalogItemId,
      quantity: item.quantity,
      lineNotes: item.notes?.trim() ?? '',
      options,
      catalogItem: {
        name: item.catalogItem.name,
        slug: item.catalogItem.slug,
        description: item.catalogItem.description,
        unitLabel: item.catalogItem.unitLabel,
        categoryName: item.catalogItem.category.name,
        thumbnailUrl: resolveCatalogThumbnail(
          item.catalogItem.slug,
          item.catalogItem.galleryImages[0]?.imageUrl
        ),
        optionsSchema: item.catalogItem.optionsSchema,
      },
    };
  });
}
