import { Prisma } from '@/generated/prisma/client';
import type { CatalogSelectionRow } from '@/lib/catalog-selection';

export type { CatalogSelectionRow } from '@/lib/catalog-selection';
export { schemaUsesCountField } from '@/lib/catalog-selection';

/**
 * Maps API catalog rows → Prisma `projectItem.createMany` rows (same rules as POST /api/projects).
 */
export function catalogRowsToProjectItemCreateMany(
  projectId: string,
  rows: CatalogSelectionRow[]
) {
  return rows.map((row) => {
    const opts = { ...(row.selectedOptions ?? {}) };
    let quantity = 1;
    if (typeof row.quantity === 'number' && row.quantity > 0) {
      quantity = Math.floor(row.quantity);
    } else if (typeof opts.count === 'number' && opts.count > 0) {
      quantity = Math.floor(opts.count);
    }
    const clean: Record<string, unknown> = { ...opts };
    delete clean.count;
    const lineNotes =
      typeof row.notes === 'string' && row.notes.trim()
        ? row.notes.trim().slice(0, 2000)
        : null;
    return {
      projectId,
      catalogItemId: row.catalogItemId,
      quantity,
      selectedOptions:
        Object.keys(clean).length > 0
          ? (clean as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      notes: lineNotes,
    };
  });
}
