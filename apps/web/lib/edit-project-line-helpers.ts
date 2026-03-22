import {
  defaultSelectedOptionsFromSchema,
  schemaUsesCountField,
  type CatalogSelectionRow,
} from '@/lib/catalog-selection';
import type { AddableCatalogEntry, EditFormLine } from '@/lib/edit-project-types';

export function prettyKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function addLineFromCatalog(cat: AddableCatalogEntry): EditFormLine {
  const defaults = defaultSelectedOptionsFromSchema(cat.optionsSchema);
  const options: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(defaults)) {
    if (typeof v === 'number' || typeof v === 'string') {
      options[k] = v as string | number;
    }
  }
  let quantity = 1;
  if (schemaUsesCountField(cat.optionsSchema) && typeof options.count === 'number') {
    quantity = options.count;
  }
  return {
    key: crypto.randomUUID(),
    catalogItemId: cat.id,
    quantity,
    lineNotes: '',
    options,
    catalogItem: {
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      unitLabel: cat.unitLabel,
      categoryName: cat.categoryName,
      thumbnailUrl: cat.thumbnailUrl,
      optionsSchema: cat.optionsSchema,
    },
  };
}

export function lineToCatalogPayload(line: EditFormLine): CatalogSelectionRow {
  const schema = line.catalogItem.optionsSchema;
  const opts = { ...line.options };
  let quantity = Math.max(1, Math.floor(line.quantity));
  const notesTrim = line.lineNotes.trim();
  const notes = notesTrim ? notesTrim.slice(0, 2000) : undefined;

  if (schemaUsesCountField(schema)) {
    const c = typeof opts.count === 'number' ? opts.count : line.quantity;
    quantity = Math.max(1, Math.floor(c));
    const clean = { ...opts };
    delete clean.count;
    return {
      catalogItemId: line.catalogItemId,
      quantity,
      selectedOptions: clean,
      ...(notes ? { notes } : {}),
    };
  }

  return {
    catalogItemId: line.catalogItemId,
    quantity,
    selectedOptions: opts,
    ...(notes ? { notes } : {}),
  };
}
