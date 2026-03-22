import Link from 'next/link';
import AcceptBidButton from '@/app/components/project/AcceptBidButton';
import type { BidComparisonSnapshot } from '@/lib/bid-comparison';
import { formatUsdWhole } from '@/lib/format-currency';

type Props = {
  projectTitle: string;
  projectId: string;
  /** Project workflow status (e.g. OPEN, AWARDED). */
  projectStatus: string;
  snapshot: BidComparisonSnapshot;
};

function fmtMoney(n: number) {
  return formatUsdWhole(n);
}

export default function BidComparisonView({
  projectTitle,
  projectId,
  projectStatus,
  snapshot,
}: Props) {
  const { bids, rows, gaps, cheapestBidId, fastestBidId } = snapshot;
  const canAccept = projectStatus === 'OPEN';

  return (
    <div className="min-w-0 space-y-8">
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to project
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Compare bids
        </h1>
        <p className="mt-2 max-w-2xl break-words text-slate-600">
          {projectTitle} — line-by-line prices, schedule, and gaps to resolve before you award work.
        </p>
      </div>

      {projectStatus === 'AWARDED' ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          <span className="font-semibold">Project awarded.</span> This job is no longer accepting new
          bids. The selected contractor was notified by email to sign in and follow up with you.
        </div>
      ) : null}

      {bids.length === 0 ? (
        <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-700">
            No active bids yet. When contractors submit prices, you&apos;ll see them here with automatic gap
            detection.
          </p>
        </div>
      ) : (
        <>
          {bids.length === 1 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              <span className="font-semibold">One bid so far.</span> You&apos;ll get the full comparison
              matrix and gap alerts when at least two contractors have submitted.
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
              <span className="font-semibold">Decision-ready view.</span> Review gaps below—especially $0
              lines and large spreads—before you choose.
            </div>
          )}

          {gaps.length > 0 ? (
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Gaps &amp; checks
              </div>
              <ul className="mt-4 space-y-4">
                {gaps.map((g) => (
                  <li
                    key={g.id}
                    className={
                      g.severity === 'warn'
                        ? 'rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3'
                        : 'rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3'
                    }
                  >
                    <div className="font-semibold text-slate-900">{g.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{g.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : bids.length >= 2 ? (
            <p className="text-sm text-slate-600">
              No major automated gaps detected—still confirm scope and materials with your top choice.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bids.map((b) => (
              <div
                key={b.id}
                className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {b.contractorLabel}
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{fmtMoney(b.total)}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {b.daysToComplete} day{b.daysToComplete === 1 ? '' : 's'} to complete
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {b.id === cheapestBidId ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-900">
                      Lowest total
                    </span>
                  ) : null}
                  {b.id === fastestBidId ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-900">
                      Shortest timeline
                    </span>
                  ) : null}
                  {b.hasCoverLetter ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                      Cover letter
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-500">
                      No cover letter
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-slate-500">Status: {b.status}</div>
                {canAccept && (b.status === 'SUBMITTED' || b.status === 'SHORTLISTED') ? (
                  <AcceptBidButton
                    projectId={projectId}
                    bidId={b.id}
                    label={b.contractorLabel}
                  />
                ) : null}
              </div>
            ))}
          </div>

          <div className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Line items by bid
            </div>
            <p className="mt-2 text-sm text-slate-600">
              $0 usually means that contractor is not including that upgrade—verify scope before comparing
              totals.
            </p>
            <div className="mt-4 max-w-full overflow-x-auto overscroll-x-contain">
              <table className="min-w-[640px] w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="sticky left-0 z-10 bg-white py-3 pr-4">Upgrade</th>
                    {bids.map((b) => (
                      <th key={b.id} className="min-w-[120px] px-2 py-3 font-semibold text-slate-700">
                        <span className="line-clamp-2">{b.contractorLabel}</span>
                      </th>
                    ))}
                    <th className="px-2 py-3 text-slate-500">Range</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.projectItemId} className="border-b border-slate-100">
                      <td className="sticky left-0 z-10 bg-white py-3 pr-4 font-medium text-slate-900">
                        {row.lineName}
                      </td>
                      {row.cells.map((cell) => (
                        <td
                          key={cell.bidId}
                          className={
                            cell.scopeGap
                              ? 'px-2 py-3 font-medium text-amber-800'
                              : cell.amount <= 0
                                ? 'px-2 py-3 text-slate-400'
                                : 'px-2 py-3 text-slate-800'
                          }
                        >
                          {cell.amount <= 0 ? '—' : fmtMoney(cell.amount)}
                          {cell.scopeGap ? (
                            <span className="ml-1 text-[10px] font-semibold uppercase text-amber-700">
                              scope?
                            </span>
                          ) : null}
                        </td>
                      ))}
                      <td className="px-2 py-3 text-xs text-slate-600">
                        {row.minPrice != null && row.maxPrice != null && row.minPrice !== row.maxPrice
                          ? `${fmtMoney(row.minPrice)} – ${fmtMoney(row.maxPrice)}`
                          : row.minPrice != null
                            ? fmtMoney(row.minPrice)
                            : '—'}
                        {row.spreadPct != null && row.spreadPct > 0 ? (
                          <span className="ml-1 text-slate-500">({row.spreadPct}% spread)</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
