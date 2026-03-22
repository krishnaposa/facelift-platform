/**
 * Typical installation cost per catalog upgrade, derived from contractor bid line items
 * (amount per project line item on past bids).
 *
 * When `zipCode` is set, aggregates prefer bid line items from projects in that zip,
 * falling back to all zips when a catalog item has no local data.
 */
import { cache } from 'react';
import { prisma } from '@/lib/prisma';

export type AvgInstallCost = {
  hasData: boolean;
  average: number | null;
  min: number | null;
  max: number | null;
  /** Number of bid line items in the average */
  count: number;
};

export function emptyAvgInstallCost(): AvgInstallCost {
  return {
    hasData: false,
    average: null,
    min: null,
    max: null,
    count: 0,
  };
}

type BidLineRow = {
  amount: number;
  catalogItemId: string;
  zipCode: string;
};

/** One DB read per request; deduped via React `cache`. */
const loadBidLineRowsWithZip = cache(async (): Promise<BidLineRow[]> => {
  const rows = await prisma.bidLineItem.findMany({
    select: {
      amount: true,
      projectItem: {
        select: {
          catalogItemId: true,
          project: { select: { zipCode: true } },
        },
      },
    },
  });

  const out: BidLineRow[] = [];
  for (const r of rows) {
    const amt = Number(r.amount);
    if (!Number.isFinite(amt)) continue;
    out.push({
      amount: amt,
      catalogItemId: r.projectItem.catalogItemId,
      zipCode: (r.projectItem.project.zipCode ?? '').trim(),
    });
  }
  return out;
});

function pushAmount(
  buckets: Map<string, number[]>,
  catalogItemId: string,
  amt: number
) {
  if (!buckets.has(catalogItemId)) buckets.set(catalogItemId, []);
  buckets.get(catalogItemId)!.push(amt);
}

function rowsToGlobalBuckets(rows: BidLineRow[]): Map<string, number[]> {
  const buckets = new Map<string, number[]>();
  for (const r of rows) {
    pushAmount(buckets, r.catalogItemId, r.amount);
  }
  return buckets;
}

function rowsToZipBuckets(rows: BidLineRow[], zip: string): Map<string, number[]> {
  const buckets = new Map<string, number[]>();
  const z = zip.trim();
  for (const r of rows) {
    if (r.zipCode === z) {
      pushAmount(buckets, r.catalogItemId, r.amount);
    }
  }
  return buckets;
}

function bucketAmountsToAvgMap(buckets: Map<string, number[]>): Map<string, AvgInstallCost> {
  const map = new Map<string, AvgInstallCost>();
  for (const [catalogItemId, amounts] of buckets) {
    if (amounts.length === 0) continue;
    const sum = amounts.reduce((a, b) => a + b, 0);
    const avg = sum / amounts.length;
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    map.set(catalogItemId, {
      hasData: true,
      average: avg,
      min,
      max,
      count: amounts.length,
    });
  }
  return map;
}

/** Zip-specific averages override global when that zip has bid history for the item. */
function mergePreferZip(
  globalMap: Map<string, AvgInstallCost>,
  zipMap: Map<string, AvgInstallCost>
): Map<string, AvgInstallCost> {
  const merged = new Map(globalMap);
  for (const [id, cost] of zipMap) {
    if (cost.hasData) merged.set(id, cost);
  }
  return merged;
}

export type AverageBidLineMapsForZips = {
  global: Map<string, AvgInstallCost>;
  /** Merged map (zip wins per item when present) keyed by normalized zip */
  mergedByZip: Map<string, Map<string, AvgInstallCost>>;
};

/**
 * Build global + per-zip merged maps in a single DB round-trip (per request).
 * Use on dashboards with many projects in different zips.
 */
export async function getAverageBidLineMapsForZips(
  zipCodes: (string | null | undefined)[]
): Promise<AverageBidLineMapsForZips> {
  try {
    const rows = await loadBidLineRowsWithZip();
    const globalMap = bucketAmountsToAvgMap(rowsToGlobalBuckets(rows));

    const unique = [...new Set(zipCodes.map((z) => (z ?? '').trim()).filter(Boolean))] as string[];
    const mergedByZip = new Map<string, Map<string, AvgInstallCost>>();
    for (const zip of unique) {
      const zipBuckets = rowsToZipBuckets(rows, zip);
      const zipMap = bucketAmountsToAvgMap(zipBuckets);
      mergedByZip.set(zip, mergePreferZip(globalMap, zipMap));
    }
    return { global: globalMap, mergedByZip };
  } catch (err) {
    console.error('[getAverageBidLineMapsForZips]', err);
    return { global: new Map(), mergedByZip: new Map() };
  }
}

/**
 * Map catalogItemId → aggregate stats from `BidLineItem.amount`.
 * Optional `zipCode`: prefer contractor line items from projects in that zip.
 */
export async function getAverageBidLineAmountByCatalogItem(options?: {
  zipCode?: string | null;
}): Promise<Map<string, AvgInstallCost>> {
  try {
    const rows = await loadBidLineRowsWithZip();
    const globalMap = bucketAmountsToAvgMap(rowsToGlobalBuckets(rows));
    const zip = options?.zipCode?.trim();
    if (!zip) return globalMap;
    const zipMap = bucketAmountsToAvgMap(rowsToZipBuckets(rows, zip));
    return mergePreferZip(globalMap, zipMap);
  } catch (err) {
    console.error('[getAverageBidLineAmountByCatalogItem]', err);
    return new Map();
  }
}
