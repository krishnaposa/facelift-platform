import Link from 'next/link';
import SafeImage from '@/app/components/ui/SafeImage';
import SuggestedAddButton from '@/app/dashboard/homeowner/SuggestedAddButton';
import type { AvgInstallCost } from '@/lib/catalog-install-cost';
import { formatUsdWhole } from '@/lib/format-currency';
import type { EnrichedCatalogItem } from '@/lib/homeowner-dashboard';

export type DashboardLineItem = {
  id: string;
  quantity: number;
  optionsLabel: string;
  /** Per-line homeowner notes for contractors. */
  contractorNotes?: string | null;
  catalogItem: {
    name: string;
    slug: string;
    description: string | null;
    categoryName: string;
    thumbnailUrl: string;
  };
  avgInstall: AvgInstallCost;
};

type Props = {
  projectId: string;
  title: string;
  zipCode: string;
  status: string;
  description: string | null;
  lineItems: DashboardLineItem[];
  photos: Array<{ id: string; imageUrl: string; caption: string | null }>;
  suggested: EnrichedCatalogItem[];
  estimate: { sum: number; linesWithData: number };
  galleryPicks: Array<{ imageUrl: string; title: string | null; keywords: string[] }>;
  comparableBidCount?: number;
};

export default function HomeownerProjectCard({
  projectId,
  title,
  zipCode,
  status,
  description,
  lineItems,
  photos,
  suggested,
  estimate,
  galleryPicks,
  comparableBidCount = 0,
}: Props) {
  return (
    <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-500">{zipCode}</div>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {status}
        </span>
      </div>

      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-600">
        {description?.trim() || 'No description yet.'}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
        <span>
          {lineItems.length} upgrade line item{lineItems.length === 1 ? '' : 's'}
        </span>
        <span>•</span>
        <span>
          {photos.length} project photo{photos.length === 1 ? '' : 's'}
        </span>
        {estimate.linesWithData > 0 ? (
          <>
            <span>•</span>
            <span className="font-medium text-emerald-800">
              Est. from bid data: {formatUsdWhole(estimate.sum)}{' '}
              <span className="font-normal text-slate-500">
                ({estimate.linesWithData} line{estimate.linesWithData === 1 ? '' : 's'} with averages;
                prefers {zipCode} when we have local line items)
              </span>
            </span>
          </>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/projects/${projectId}`}
          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
        >
          View
        </Link>

        <Link
          href={`/projects/${projectId}/edit`}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        >
          Edit
        </Link>

        {comparableBidCount > 0 ? (
          <Link
            href={`/projects/${projectId}/compare-bids`}
            className="rounded-2xl border border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            {comparableBidCount >= 2 ? 'Compare bids & gaps' : 'View bid'}
          </Link>
        ) : null}
      </div>

      {galleryPicks.length > 0 ? (
        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            AI gallery picks
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {galleryPicks.map((p, idx) => (
              <div
                key={`${projectId}-pick-${idx}`}
                className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200"
                title={p.keywords?.join(', ') || undefined}
              >
                <SafeImage
                  src={p.imageUrl}
                  alt={p.title || title}
                  className="h-24 w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <details className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/90 [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
          Line items, costs, photos &amp; ideas
        </summary>

        <div className="space-y-6 border-t border-slate-200 px-4 pb-5 pt-4">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Your upgrades
            </h3>
            <ul className="mt-3 space-y-4">
              {lineItems.map((row) => (
                <li
                  key={row.id}
                  className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200"
                >
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    <SafeImage
                      src={row.catalogItem.thumbnailUrl}
                      alt={row.catalogItem.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold uppercase text-slate-500">
                      {row.catalogItem.categoryName}
                    </div>
                    <div className="font-semibold text-slate-900">{row.catalogItem.name}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Qty {row.quantity}
                      {row.optionsLabel ? (
                        <span className="text-slate-500"> · {row.optionsLabel}</span>
                      ) : null}
                    </div>
                    {row.contractorNotes ? (
                      <p className="mt-2 rounded-lg bg-amber-50/90 px-2 py-1.5 text-xs text-amber-950 ring-1 ring-amber-100">
                        <span className="font-semibold">Contractor note: </span>
                        {row.contractorNotes}
                      </p>
                    ) : null}
                    {row.avgInstall.hasData && row.avgInstall.average != null ? (
                      <div className="mt-2 text-sm text-emerald-800">
                        Typical install (from bids): {formatUsdWhole(row.avgInstall.average)}
                        {row.quantity > 1 ? (
                          <span className="text-emerald-700/90">
                            {' '}
                            × {row.quantity} ≈ {formatUsdWhole(row.avgInstall.average * row.quantity)}
                          </span>
                        ) : null}
                        {row.avgInstall.min != null && row.avgInstall.max != null ? (
                          <span className="block text-xs text-emerald-700/80">
                            Range {formatUsdWhole(row.avgInstall.min)} –{' '}
                            {formatUsdWhole(row.avgInstall.max)} ({row.avgInstall.count} bid line items)
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">
                        No typical install data yet — bids will price this line.
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {photos.length > 0 ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Your project photos
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200"
                  >
                    <SafeImage
                      src={photo.imageUrl}
                      alt={photo.caption || title}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    {photo.caption ? (
                      <p className="p-2 text-xs text-slate-600">{photo.caption}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <p className="text-sm text-slate-500">No reference photos on this project yet.</p>
          )}

          {suggested.length > 0 ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Suggested to add
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Popular upgrades in your categories that aren&apos;t in this project yet. Add them
                from Edit.
              </p>
              <ul className="mt-3 space-y-3">
                {suggested.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200/80"
                  >
                    <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <SafeImage
                        src={s.thumbnailUrl}
                        alt={s.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        {s.categoryName}
                      </div>
                      <div className="text-sm font-medium text-slate-900">{s.name}</div>
                      {s.avgInstall.hasData && s.avgInstall.average != null ? (
                        <div className="text-xs text-emerald-800">
                          Avg. install {formatUsdWhole(s.avgInstall.average)}
                        </div>
                      ) : null}
                    </div>
                    <SuggestedAddButton projectId={projectId} catalogItemId={s.id} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </details>
    </div>
  );
}
