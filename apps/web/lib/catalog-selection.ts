/**
 * Catalog selection types + helpers safe for client components (no Prisma / Node APIs).
 */
export type CatalogSelectionRow = {
  catalogItemId: string;
  quantity?: number;
  selectedOptions?: Record<string, unknown>;
};

/** True when optionsSchema uses `count: 'number'` (e.g. bidets). */
export function schemaUsesCountField(schema: unknown): boolean {
  return (
    !!schema &&
    typeof schema === 'object' &&
    (schema as Record<string, unknown>).count === 'number'
  );
}

/**
 * Default option values from catalog `optionsSchema` (first enum value, 1 for number fields).
 * Safe for client components — keep Prisma-only helpers in `project-item-defaults.ts`.
 */
export function defaultSelectedOptionsFromSchema(schema: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!schema || typeof schema !== 'object') return out;
  for (const [key, val] of Object.entries(schema as Record<string, unknown>)) {
    if (Array.isArray(val) && val.length > 0) out[key] = val[0];
    else if (val === 'number') out[key] = 1;
  }
  return out;
}
