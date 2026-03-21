/**
 * Typical installation cost per catalog upgrade, derived from contractor bid line items
 * (amount per project line item on past bids).
 */
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

/**
 * Map catalogItemId → aggregate stats from `BidLineItem.amount`.
 */
export async function getAverageBidLineAmountByCatalogItem(): Promise<
  Map<string, AvgInstallCost>
> {
  const map = new Map<string, AvgInstallCost>();
  try {
    const rows = await prisma.bidLineItem.findMany({
      select: {
        amount: true,
        projectItem: { select: { catalogItemId: true } },
      },
    });

    const buckets = new Map<string, number[]>();
    for (const row of rows) {
      const id = row.projectItem.catalogItemId;
      const amt = Number(row.amount);
      if (!Number.isFinite(amt)) continue;
      if (!buckets.has(id)) buckets.set(id, []);
      buckets.get(id)!.push(amt);
    }

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
  } catch (err) {
    console.error('[getAverageBidLineAmountByCatalogItem]', err);
  }
  return map;
}
