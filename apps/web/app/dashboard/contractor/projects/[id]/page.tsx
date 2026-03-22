import EstimateExplainerBlock from '@/app/components/project/EstimateExplainerBlock';
import Link from 'next/link';
import SafeImage from '@/app/components/ui/SafeImage';
import ContractorBidForm from '@/app/dashboard/contractor/projects/ContractorBidForm';
import ContractorMessageForm from '@/app/dashboard/contractor/projects/ContractorMessageForm';
import { redirect, notFound } from 'next/navigation';
import {
  emptyAvgInstallCost,
  getAverageBidLineAmountByCatalogItem,
} from '@/lib/catalog-install-cost';
import { formatUsdWhole } from '@/lib/format-currency';
import { formatSelectedOptions } from '@/lib/homeowner-dashboard';
import { resolveCatalogThumbnail } from '@/lib/catalog-landing';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { contractorApprovalBlockReason } from '@/lib/contractor-approval';
import { getProjectCostEstimate } from '@/lib/project-cost';

export const dynamic = 'force-dynamic';

function optionsLineForDisplay(selectedOptions: unknown): string {
  if (!selectedOptions || typeof selectedOptions !== 'object') return '';
  const copy = { ...(selectedOptions as Record<string, unknown>) };
  delete copy.count;
  return formatSelectedOptions(copy);
}

export default async function ContractorProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'ADMIN') {
    redirect('/dashboard/admin');
  }

  if (session.role !== 'CONTRACTOR') {
    redirect('/dashboard/homeowner');
  }

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      status: 'OPEN',
    },
    include: {
      items: {
        include: {
          catalogItem: {
            include: {
              category: true,
              galleryImages: {
                where: { isPublic: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { imageUrl: true },
              },
            },
          },
        },
      },
      photos: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const [costEstimate, avgMap, existingBid, approvalLock] = await Promise.all([
    getProjectCostEstimate(project.id),
    getAverageBidLineAmountByCatalogItem({ zipCode: project.zipCode }),
    prisma.bid.findUnique({
      where: {
        projectId_contractorId: {
          projectId: project.id,
          contractorId: session.userId,
        },
      },
      include: { lineItems: true },
    }),
    contractorApprovalBlockReason(session.userId),
  ]);

  const canBidAndMessage = approvalLock == null;

  const bidLines = project.items.map((item) => {
    const existing = existingBid?.lineItems.find((l) => l.projectItemId === item.id);
    return {
      projectItemId: item.id,
      catalogName: item.catalogItem.name,
      amount: existing != null ? String(Number(existing.amount)) : '',
      note: existing?.note ?? '',
    };
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Open project
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
              {project.title}
            </h1>
            <p className="mt-2 text-slate-600">
              {project.zipCode} • {project.status}
            </p>
          </div>

          <Link
            href="/dashboard/contractor/projects"
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
          >
            All open projects
          </Link>
        </div>

        {existingBid ? (
          <div className="mt-6 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-950 ring-1 ring-sky-100">
            <span className="font-semibold">Your bid: </span>
            {formatUsdWhole(Number(existingBid.amount))} · {existingBid.daysToComplete} day
            {existingBid.daysToComplete === 1 ? '' : 's'} to complete · {existingBid.status}
            {existingBid.lineItems.length > 0 ? (
              <span className="text-sky-900/90">
                {' '}
                ({existingBid.lineItems.length} line item
                {existingBid.lineItems.length === 1 ? '' : 's'} priced)
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="h-fit w-full rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Description
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {project.description?.trim() || 'No description provided.'}
            </p>
          </div>

          <div className="h-fit min-h-0 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Estimated cost in this zip
            </div>
            {costEstimate.hasData ? (
              <div className="mt-4 space-y-2">
                <div className="text-2xl font-semibold text-slate-900">
                  ${costEstimate.average?.toFixed(0)}
                </div>
                {costEstimate.min && costEstimate.max && (
                  <div className="text-sm text-slate-600">
                    Typical range ${costEstimate.min.toFixed(0)} – ${costEstimate.max.toFixed(0)} from{' '}
                    {costEstimate.count} bid{costEstimate.count === 1 ? '' : 's'} in {project.zipCode}.
                  </div>
                )}
                {costEstimate.explainer ? (
                  <EstimateExplainerBlock explainer={costEstimate.explainer} />
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                Not enough bid history in {project.zipCode} yet for an automated estimate.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Requested upgrades
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Price each line in your bid below. Use <span className="font-medium">Message homeowner</span>{' '}
            for questions about the whole job or a specific upgrade.
          </p>
          <ContractorMessageForm
            projectId={project.id}
            contextLabel="whole project"
            canInteract={canBidAndMessage}
            lockedReason={approvalLock ?? undefined}
          />
          <div className="mt-4 space-y-4">
            {project.items.map((item) => {
              const thumb = resolveCatalogThumbnail(
                item.catalogItem.slug,
                item.catalogItem.galleryImages[0]?.imageUrl
              );
              const optsText = optionsLineForDisplay(item.selectedOptions);
              const avg = avgMap.get(item.catalogItemId) ?? emptyAvgInstallCost();
              return (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                >
                  <div className="relative h-28 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-32 sm:w-40">
                    <SafeImage
                      src={thumb}
                      alt={item.catalogItem.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.catalogItem.category.name}
                    </div>
                    <div className="text-lg font-semibold text-slate-900">{item.catalogItem.name}</div>
                    {item.catalogItem.description ? (
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {item.catalogItem.description}
                      </p>
                    ) : null}
                    <div className="mt-3 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Quantity:</span> {item.quantity}
                      {item.catalogItem.unitLabel ? (
                        <span className="text-slate-500"> ({item.catalogItem.unitLabel})</span>
                      ) : null}
                    </div>
                    {optsText ? (
                      <div className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200/80">
                        <span className="font-medium text-slate-800">Selections: </span>
                        {optsText}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">Catalog defaults.</p>
                    )}
                    {item.notes ? (
                      <p className="mt-2 rounded-xl bg-amber-50/90 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-100">
                        <span className="font-semibold">Homeowner note: </span>
                        {item.notes}
                      </p>
                    ) : null}
                    {avg.hasData && avg.average != null ? (
                      <div className="mt-3 text-sm text-emerald-800">
                        <span className="font-semibold">Typical line install (area data): </span>
                        {formatUsdWhole(avg.average)}
                        {item.quantity > 1 ? (
                          <span className="text-emerald-900/90">
                            {' '}
                            × {item.quantity} ≈ {formatUsdWhole(avg.average * item.quantity)}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">No typical line price in our data yet.</p>
                    )}
                    <ContractorMessageForm
                      projectId={project.id}
                      projectItemId={item.id}
                      contextLabel="this line"
                      canInteract={canBidAndMessage}
                      lockedReason={approvalLock ?? undefined}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Your bid
          </div>
          <p className="mt-2 text-sm text-slate-600">
            One bid per company per project. Totals must match the sum of your line prices.
          </p>
          {bidLines.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">This project has no line items yet.</p>
          ) : (
            <div className="mt-6">
              <ContractorBidForm
                projectId={project.id}
                lines={bidLines}
                existingTotal={existingBid ? Number(existingBid.amount) : null}
                existingDays={existingBid?.daysToComplete ?? null}
                existingMessage={existingBid?.message ?? null}
                canInteract={canBidAndMessage}
                lockedReason={approvalLock ?? undefined}
              />
            </div>
          )}
        </div>

        <div className="mt-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Photos
          </div>
          {project.photos.length === 0 ? (
            <p className="mt-4 text-slate-600">No photos on this project.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {project.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-[24px] bg-slate-50 ring-1 ring-slate-200"
                >
                  <SafeImage
                    src={photo.imageUrl}
                    alt={photo.caption || project.title}
                    className="h-56 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
