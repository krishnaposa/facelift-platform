import Link from 'next/link';
import SafeImage from '@/app/components/ui/SafeImage';
import SuggestedAddButton from '@/app/dashboard/homeowner/SuggestedAddButton';
import { redirect, notFound } from 'next/navigation';
import {
  emptyAvgInstallCost,
  getAverageBidLineAmountByCatalogItem,
} from '@/lib/catalog-install-cost';
import { formatUsdWhole } from '@/lib/format-currency';
import {
  enrichCatalogForDashboard,
  formatSelectedOptions,
  pickSuggestedCatalogItems,
} from '@/lib/homeowner-dashboard';
import { resolveCatalogThumbnail } from '@/lib/catalog-landing';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import EstimateExplainerBlock from '@/app/components/project/EstimateExplainerBlock';
import { getGalleryForProject } from '@/lib/project-gallery';
import { getProjectCostEstimate } from '@/lib/project-cost';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      homeownerId: session.userId,
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
        orderBy: {
          sortOrder: 'asc',
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const [gallery, costEstimate, avgMap, allCatalogRows, contractorInquiries] = await Promise.all([
    getGalleryForProject(project.id),
    getProjectCostEstimate(project.id),
    getAverageBidLineAmountByCatalogItem({ zipCode: project.zipCode }),
    prisma.catalogItem.findMany({
      where: { active: true },
      include: {
        category: true,
        galleryImages: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { imageUrl: true },
        },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    }),
    prisma.projectContractorMessage.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
      include: {
        contractor: {
          select: {
            email: true,
            contractorProfile: { select: { companyName: true } },
          },
        },
        projectItem: {
          select: {
            catalogItem: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const catalogEnriched = enrichCatalogForDashboard(allCatalogRows, avgMap);
  const selectedCatalogIds = new Set(project.items.map((i) => i.catalogItemId));
  const suggested = pickSuggestedCatalogItems(selectedCatalogIds, catalogEnriched, 8);

  function optionsLineForDisplay(selectedOptions: unknown): string {
    if (!selectedOptions || typeof selectedOptions !== 'object') return '';
    const copy = { ...(selectedOptions as Record<string, unknown>) };
    delete copy.count;
    return formatSelectedOptions(copy);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Project Detail
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
              {project.title}
            </h1>
            <p className="mt-2 text-slate-600">
              {project.zipCode} • {project.status}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/homeowner"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
            >
              Back
            </Link>

            <Link
              href={`/projects/${project.id}/edit`}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Edit Project
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="h-fit w-full rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Description
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {project.description?.trim() || 'No description provided.'}
            </p>
          </div>

          <div className="min-h-0 space-y-6">
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Requested upgrades
              </div>
              <p className="mt-2 text-sm text-slate-600">
                What you asked contractors to bid on, with the choices you selected.
              </p>
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
                        <div className="text-lg font-semibold text-slate-900">
                          {item.catalogItem.name}
                        </div>
                        {item.catalogItem.description ? (
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            {item.catalogItem.description}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                          <span>
                            <span className="font-medium text-slate-900">Quantity:</span>{' '}
                            {item.quantity}
                            {item.catalogItem.unitLabel ? (
                              <span className="text-slate-500"> ({item.catalogItem.unitLabel})</span>
                            ) : null}
                          </span>
                        </div>
                        {optsText ? (
                          <div className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200/80">
                            <span className="font-medium text-slate-800">Your selections: </span>
                            {optsText}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">Using catalog defaults.</p>
                        )}
                        {item.notes ? (
                          <p className="mt-2 rounded-xl bg-amber-50/90 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-100">
                            <span className="font-semibold">Note for contractors: </span>
                            {item.notes}
                          </p>
                        ) : null}
                        {avg.hasData && avg.average != null ? (
                          <div className="mt-3 text-sm text-emerald-800">
                            <span className="font-semibold">Typical install (from bid line items): </span>
                            {formatUsdWhole(avg.average)}
                            {item.quantity > 1 ? (
                              <span className="text-emerald-900/90">
                                {' '}
                                × {item.quantity} ≈ {formatUsdWhole(avg.average * item.quantity)}
                              </span>
                            ) : null}
                            {avg.min != null && avg.max != null ? (
                              <span className="mt-1 block text-xs text-emerald-800/85">
                                Range {formatUsdWhole(avg.min)} – {formatUsdWhole(avg.max)} (
                                {avg.count} bid line item{avg.count === 1 ? '' : 's'})
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-slate-500">
                            No typical line-item price in our data yet — bids will reflect your scope.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Estimated cost in your area
              </div>
              {costEstimate.hasData ? (
                <div className="mt-4 space-y-2">
                  <div className="text-2xl font-semibold text-slate-900">
                    ${costEstimate.average?.toFixed(0)}
                  </div>
                  {costEstimate.min && costEstimate.max && (
                    <div className="text-sm text-slate-600">
                      Typical range ${costEstimate.min.toFixed(0)} – $
                      {costEstimate.max.toFixed(0)} based on {costEstimate.count}{' '}
                      bid{costEstimate.count === 1 ? '' : 's'} in {project.zipCode}.
                    </div>
                  )}
                  {costEstimate.explainer ? (
                    <EstimateExplainerBlock explainer={costEstimate.explainer} />
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 text-sm text-slate-600">
                  We don&apos;t have enough bids in {project.zipCode} yet to show an
                  average price for this kind of project.
                </div>
              )}
            </div>
          </div>
        </div>

        {contractorInquiries.length > 0 ? (
          <div className="mt-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Contractor questions
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Clarifications contractors sent while reviewing your scope.
            </p>
            <ul className="mt-4 space-y-4">
              {contractorInquiries.map((m) => (
                <li
                  key={m.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">
                      {m.contractor.contractorProfile?.companyName ?? m.contractor.email}
                    </span>
                    <time dateTime={m.createdAt.toISOString()}>
                      {new Intl.DateTimeFormat('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(m.createdAt)}
                    </time>
                  </div>
                  {m.projectItem ? (
                    <div className="mt-1 text-xs font-semibold text-slate-600">
                      Re: {m.projectItem.catalogItem.name}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs font-semibold text-slate-600">Whole project</div>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{m.body}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Photos
          </div>
          {project.photos.length === 0 ? (
            <p className="mt-4 text-slate-600">No photos added yet.</p>
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

        {suggested.length > 0 ? (
          <div className="mt-8 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Add more upgrades
            </div>
            <p className="mt-2 max-w-2xl text-slate-600">
              One tap adds an upgrade to this project with default options (same as the dashboard).
              You can fine-tune on the edit page.
            </p>
            <ul className="mt-6 space-y-3">
              {suggested.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                >
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    <SafeImage
                      src={s.thumbnailUrl}
                      alt={s.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold uppercase text-slate-500">
                      {s.categoryName}
                    </div>
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    {s.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{s.description}</p>
                    ) : null}
                    {s.avgInstall.hasData && s.avgInstall.average != null ? (
                      <div className="mt-1 text-sm text-emerald-800">
                        Typical install (from bids): {formatUsdWhole(s.avgInstall.average)}
                      </div>
                    ) : null}
                  </div>
                  <SuggestedAddButton projectId={project.id} catalogItemId={s.id} />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-8 rounded-[28px] bg-slate-50 p-6 ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">
              All active catalog upgrades are already on this project, or the catalog is empty.
            </p>
          </div>
        )}

        {gallery.length > 0 && (
          <div className="mt-8 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Ideas for your project
            </div>
            <p className="mt-2 text-slate-600">
              Gallery images matched to your selected upgrades.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((img) => (
                <div
                  key={img.id}
                  className="overflow-hidden rounded-[24px] bg-slate-50 ring-1 ring-slate-200"
                >
                  <SafeImage
                    src={img.imageUrl}
                    alt={img.title || img.caption || img.catalogItemName || 'Gallery'}
                    className="h-56 w-full object-cover"
                  />
                  <div className="p-4">
                    {img.catalogItemName && (
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {img.catalogItemName}
                      </div>
                    )}
                    <div className="mt-1 font-semibold text-slate-900">
                      {img.title || img.caption || '—'}
                    </div>
                    {img.styleTag && (
                      <div className="mt-1 text-sm text-slate-600">{img.styleTag}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
