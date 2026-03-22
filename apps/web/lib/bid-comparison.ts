/**
 * Homeowner bid comparison + gap detection (scope, price spread, schedule).
 */

export type ProjectLineRef = {
  id: string;
  name: string;
};

export type ComparableBidInput = {
  id: string;
  status: string;
  contractorLabel: string;
  total: number;
  daysToComplete: number;
  hasCoverLetter: boolean;
  /** One row per project line, amount in dollars */
  lineByProjectItemId: Map<string, { amount: number; note: string | null }>;
};

export type BidComparisonRow = {
  projectItemId: string;
  lineName: string;
  /** amount per bid column, null if missing key (shouldn't happen) */
  cells: Array<{
    bidId: string;
    amount: number;
    /** priced at 0 while at least one other bid is > 0 on this line */
    scopeGap: boolean;
  }>;
  /** Among bids with amount > 0 */
  minPrice: number | null;
  maxPrice: number | null;
  spreadPct: number | null;
};

export type BidComparisonGap = {
  id: string;
  severity: 'warn' | 'info';
  title: string;
  detail: string;
};

export type BidComparisonSnapshot = {
  bids: Array<{
    id: string;
    contractorLabel: string;
    status: string;
    total: number;
    daysToComplete: number;
    hasCoverLetter: boolean;
  }>;
  rows: BidComparisonRow[];
  gaps: BidComparisonGap[];
  cheapestBidId: string | null;
  fastestBidId: string | null;
  scheduleSpreadDays: number;
};

/** Map API/Prisma bid + line items into comparison input. */
export function toComparableBidInput(bid: {
  id: string;
  status: string;
  amount: unknown;
  daysToComplete: number;
  message: string | null;
  contractor: { email: string; contractorProfile: { companyName: string | null } | null };
  lineItems: Array<{ projectItemId: string; amount: unknown; note: string | null }>;
}): ComparableBidInput {
  const lineByProjectItemId = new Map<string, { amount: number; note: string | null }>();
  for (const li of bid.lineItems) {
    lineByProjectItemId.set(li.projectItemId, {
      amount: Number(li.amount),
      note: li.note,
    });
  }
  return {
    id: bid.id,
    status: bid.status,
    contractorLabel: bid.contractor.contractorProfile?.companyName ?? bid.contractor.email,
    total: Number(bid.amount),
    daysToComplete: bid.daysToComplete,
    hasCoverLetter: !!(bid.message && String(bid.message).trim()),
    lineByProjectItemId,
  };
}

const SPREAD_WARN_PCT = 35;
const SCHEDULE_WARN_DAYS = 10;

function labelForBid(b: ComparableBidInput): string {
  return b.contractorLabel;
}

export function buildBidComparisonSnapshot(
  projectLines: ProjectLineRef[],
  bids: ComparableBidInput[]
): BidComparisonSnapshot {
  const bidMetas = bids.map((b) => ({
    id: b.id,
    contractorLabel: labelForBid(b),
    status: b.status,
    total: b.total,
    daysToComplete: b.daysToComplete,
    hasCoverLetter: b.hasCoverLetter,
  }));

  const rows: BidComparisonRow[] = projectLines.map((line) => {
    const cells = bids.map((b) => {
      const cell = b.lineByProjectItemId.get(line.id);
      const amount = cell ? Number(cell.amount) : 0;
      const othersPositive = bids.some((ob) => {
        const o = ob.lineByProjectItemId.get(line.id);
        return o != null && Number(o.amount) > 0;
      });
      const scopeGap = amount <= 0 && othersPositive;
      return { bidId: b.id, amount, scopeGap };
    });

    const positive = cells.map((c) => c.amount).filter((a) => a > 0);
    const minPrice = positive.length ? Math.min(...positive) : null;
    const maxPrice = positive.length ? Math.max(...positive) : null;
    let spreadPct: number | null = null;
    if (
      minPrice != null &&
      maxPrice != null &&
      minPrice > 0 &&
      positive.length >= 2 &&
      maxPrice > minPrice
    ) {
      spreadPct = Math.round(((maxPrice - minPrice) / minPrice) * 1000) / 10;
    }

    return {
      projectItemId: line.id,
      lineName: line.name,
      cells,
      minPrice,
      maxPrice,
      spreadPct,
    };
  });

  const gaps: BidComparisonGap[] = [];

  const daysAll = bids.map((b) => b.daysToComplete);
  const scheduleSpreadDays =
    daysAll.length >= 2 ? Math.max(...daysAll) - Math.min(...daysAll) : 0;

  if (bids.length >= 2) {
    for (const row of rows) {
      const excluded = row.cells
        .filter((c) => c.scopeGap)
        .map((c) => bids.find((b) => b.id === c.bidId))
        .filter(Boolean) as ComparableBidInput[];
      if (excluded.length > 0) {
        const names = excluded.map((b) => labelForBid(b)).join(', ');
        gaps.push({
          id: `scope-${row.projectItemId}`,
          severity: 'warn',
          title: `Scope gap: ${row.lineName}`,
          detail: `${names} priced this line at $0 while another bid includes it — confirm what’s in or out of scope before you decide.`,
        });
      }
      if (
        row.spreadPct != null &&
        row.spreadPct >= SPREAD_WARN_PCT &&
        row.cells.filter((c) => c.amount > 0).length >= 2
      ) {
        gaps.push({
          id: `spread-${row.projectItemId}`,
          severity: 'warn',
          title: `Large price spread: ${row.lineName}`,
          detail: `Line-item prices differ by about ${row.spreadPct}% among bids that include this work. Ask what assumptions (materials, prep, haul-away) each bid uses.`,
        });
      }
    }

    if (scheduleSpreadDays >= SCHEDULE_WARN_DAYS && daysAll.length >= 2) {
      const minD = Math.min(...daysAll);
      const maxD = Math.max(...daysAll);
      gaps.push({
        id: 'schedule',
        severity: 'info',
        title: 'Schedule range',
        detail: `Completion timelines range from ${minD} to ${maxD} calendar days (${scheduleSpreadDays} day spread). Align on start date and what drives the longer schedule.`,
      });
    }

    const withLetter = bids.filter((b) => b.hasCoverLetter).length;
    const withoutLetter = bids.length - withLetter;
    if (withLetter > 0 && withoutLetter > 0) {
      gaps.push({
        id: 'cover-letter',
        severity: 'info',
        title: 'Cover letter coverage',
        detail: `Some bids include a written cover letter and others don’t — compare scope and assumptions in the line items and notes, not only the total.`,
      });
    }

    const totals = bids.map((b) => b.total).filter((t) => t > 0);
    if (totals.length >= 3) {
      const sorted = [...totals].sort((a, b) => a - b);
      const mid = sorted.length % 2 === 1
        ? sorted[Math.floor(sorted.length / 2)]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
      const low = bids.filter((b) => b.total > 0 && b.total < mid * 0.65);
      if (low.length > 0 && mid > 0) {
        gaps.push({
          id: 'low-total',
          severity: 'warn',
          title: 'Unusually low total',
          detail: `At least one bid is far below the middle of the pack — double-check that all lines you need are included (not left at $0).`,
        });
      }
    }
  }

  const cheapestBidId =
    bids.length > 0
      ? bids.reduce((a, b) => (a.total <= b.total ? a : b), bids[0]).id
      : null;
  const fastestBidId =
    bids.length > 0
      ? bids.reduce((a, b) => (a.daysToComplete <= b.daysToComplete ? a : b), bids[0]).id
      : null;

  return {
    bids: bidMetas,
    rows,
    gaps,
    cheapestBidId,
    fastestBidId,
    scheduleSpreadDays,
  };
}
