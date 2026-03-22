/**
 * Edit-project form types only — no server/Prisma imports (safe for `import type` in client components).
 */
export type EditFormLine = {
  key: string;
  catalogItemId: string;
  quantity: number;
  options: Record<string, string | number>;
  /** Notes visible to contractors for this line item only. */
  lineNotes: string;
  catalogItem: {
    name: string;
    slug: string;
    description: string | null;
    unitLabel: string | null;
    categoryName: string;
    thumbnailUrl: string;
    optionsSchema: unknown;
  };
};

export type AddableCatalogEntry = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unitLabel: string | null;
  categoryName: string;
  thumbnailUrl: string;
  optionsSchema: unknown;
};
