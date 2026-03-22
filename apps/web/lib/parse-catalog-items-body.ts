import type { CatalogSelectionRow } from '@/lib/catalog-selection';

/** Parse `catalogItems` array from JSON body (homeowner PATCH, admin PATCH). */
export function parseCatalogItemsBody(body: unknown): CatalogSelectionRow[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.catalogItems)) return [];
  return (b.catalogItems as unknown[])
    .filter(
      (r): r is Record<string, unknown> =>
        !!r && typeof r === 'object' && typeof (r as { catalogItemId?: unknown }).catalogItemId === 'string'
    )
    .map((row) => ({
      catalogItemId: String(row.catalogItemId),
      quantity: typeof row.quantity === 'number' ? row.quantity : undefined,
      selectedOptions:
        row.selectedOptions &&
        typeof row.selectedOptions === 'object' &&
        !Array.isArray(row.selectedOptions)
          ? (row.selectedOptions as Record<string, unknown>)
          : undefined,
      notes:
        typeof row.notes === 'string' && row.notes.trim()
          ? row.notes.trim().slice(0, 2000)
          : undefined,
    }));
}
