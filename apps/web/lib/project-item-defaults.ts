import { Prisma } from '@/generated/prisma/client';
import { defaultSelectedOptionsFromSchema } from '@/lib/catalog-selection';

/**
 * `quantity` on ProjectItem + JSON without `count` when schema uses count for qty.
 */
export function buildNewProjectItemPayload(optionsSchema: unknown): {
  quantity: number;
  selectedOptions: Prisma.InputJsonValue | typeof Prisma.JsonNull;
} {
  const opts = defaultSelectedOptionsFromSchema(optionsSchema);
  let quantity = 1;
  if (typeof opts.count === 'number' && opts.count > 0) {
    quantity = Math.floor(opts.count);
  }
  const clean = { ...opts };
  delete clean.count;
  return {
    quantity,
    selectedOptions:
      Object.keys(clean).length > 0 ? (clean as Prisma.InputJsonValue) : Prisma.JsonNull,
  };
}
