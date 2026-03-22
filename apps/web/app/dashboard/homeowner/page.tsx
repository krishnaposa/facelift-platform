import Link from 'next/link';
import SafeImage from '@/app/components/ui/SafeImage';
import HomeownerProjectCard from '@/app/dashboard/homeowner/HomeownerProjectCard';
import HomeownerProjectsLayout from '@/app/dashboard/homeowner/HomeownerProjectsLayout';
import { redirect } from 'next/navigation';
import {
  emptyAvgInstallCost,
  getAverageBidLineMapsForZips,
} from '@/lib/catalog-install-cost';
import {
  enrichCatalogForDashboard,
  estimateProjectFromLineItemAverages,
  formatSelectedOptions,
  pickSuggestedCatalogItems,
} from '@/lib/homeowner-dashboard';
import { resolveCatalogThumbnail } from '@/lib/catalog-landing';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  refreshProjectGalleryPicks,
  refreshUserGalleryPicks,
  shouldRefreshProjectGalleryPicks,
  shouldRefreshUserGalleryPicks,
} from '@/lib/project-gallery';

export const dynamic = 'force-dynamic';

export default async function HomeownerDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'ADMIN') {
    redirect('/dashboard/admin');
  }

  if (session.role === 'CONTRACTOR') {
    redirect('/dashboard/contractor');
  }

  if (session.role !== 'HOMEOWNER') {
    redirect('/login');
  }

  const projects = await prisma.project.findMany({
    where: {
      homeownerId: session.userId,
    },
    orderBy: {
      createdAt: 'desc',
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

  const [allCatalogRows, bidMaps, bidCountRows] = await Promise.all([
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
    getAverageBidLineMapsForZips(
      projects.length > 0 ? projects.map((p) => p.zipCode) : []
    ),
    projects.length > 0
      ? prisma.bid.groupBy({
          by: ['projectId'],
          where: {
            projectId: { in: projects.map((p) => p.id) },
            status: { in: ['SUBMITTED', 'SHORTLISTED', 'ACCEPTED'] },
          },
          _count: { _all: true },
        })
      : Promise.resolve([] as Array<{ projectId: string; _count: { _all: number } }>),
  ]);

  const bidCountByProject = new Map<string, number>(
    bidCountRows.map((r) => [r.projectId, r._count._all])
  );

  // If the user has projects, refresh AI gallery picks when stale (best-effort).
  if (projects.length > 0) {
    await Promise.allSettled(
      projects.slice(0, 12).map(async (p) => {
        if (await shouldRefreshProjectGalleryPicks(p.id)) {
          return refreshProjectGalleryPicks(p.id);
        }
      })
    );
  } else {
    try {
      if (await shouldRefreshUserGalleryPicks(session.userId)) {
        await refreshUserGalleryPicks(session.userId);
      }
    } catch {
      // ignore until DB is migrated / client generated
    }
  }

  const picksByProjectId = new Map<
    string,
    Array<{ imageUrl: string; title: string | null; keywords: string[] }>
  >();
  try {
    if (projects.length > 0) {
      const picks = await (prisma as any).projectGalleryPick?.findMany?.({
        where: { projectId: { in: projects.map((p) => p.id) } },
        orderBy: [{ projectId: 'asc' }, { rank: 'asc' }],
        include: { galleryImage: true },
      });

      if (Array.isArray(picks)) {
        for (const pick of picks) {
          const projectId = String(pick.projectId);
          const list = picksByProjectId.get(projectId) ?? [];
          if (list.length >= 2) continue; // top 2 per project
          list.push({
            imageUrl: String(pick.galleryImage?.imageUrl ?? ''),
            title: (pick.galleryImage?.title ?? null) as string | null,
            keywords: Array.isArray(pick.keywords) ? pick.keywords : [],
          });
          picksByProjectId.set(projectId, list);
        }
      }
    }
  } catch {
    // ignore until DB is migrated / client generated
  }

  let userGallery: Array<{ imageUrl: string; title: string | null; keywords: string[] }> = [];
  if (projects.length === 0) {
    try {
      const picks = await (prisma as any).userGalleryPick?.findMany?.({
        where: { userId: session.userId },
        orderBy: { rank: 'asc' },
        include: { galleryImage: true },
      });
      if (Array.isArray(picks)) {
        userGallery = picks.map((p: any) => ({
          imageUrl: String(p.galleryImage?.imageUrl ?? ''),
          title: (p.galleryImage?.title ?? null) as string | null,
          keywords: Array.isArray(p.keywords) ? p.keywords : [],
        }));
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Homeowner Dashboard
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              My Projects
            </h1>
            <p className="mt-2 break-words text-slate-600">{session.email}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
              >
                Log Out
              </button>
            </form>

            <Link
              href="/projects/new"
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
            >
              New Project
            </Link>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="mt-8 rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900">No projects yet</h2>
            <p className="mt-2 text-slate-600">
              Create your first facelift project to start getting bids.
            </p>
            <Link
              href="/projects/new"
              className="mt-6 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
            >
              Create Project
            </Link>

            {userGallery.length > 0 && (
              <div className="mt-8">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  AI gallery for you
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  {userGallery.map((img, idx) => (
                    <div
                      key={`user-gallery-${idx}`}
                      className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200"
                      title={img.keywords.join(', ')}
                    >
                      <SafeImage
                        src={img.imageUrl}
                        alt={img.title ?? 'Gallery'}
                        className="h-24 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <HomeownerProjectsLayout>
            {projects.map((project) => {
              const avgMap =
                bidMaps.mergedByZip.get(project.zipCode.trim()) ?? bidMaps.global;
              const catalogEnriched = enrichCatalogForDashboard(allCatalogRows, avgMap);
              const selectedIds = new Set(project.items.map((i) => i.catalogItemId));
              const suggested = pickSuggestedCatalogItems(selectedIds, catalogEnriched, 5);
              const estimate = estimateProjectFromLineItemAverages(
                project.items.map((i) => ({
                  quantity: i.quantity,
                  catalogItemId: i.catalogItemId,
                })),
                avgMap
              );

              const lineItems = project.items.map((item) => ({
                id: item.id,
                quantity: item.quantity,
                optionsLabel: formatSelectedOptions(item.selectedOptions),
                contractorNotes: item.notes,
                catalogItem: {
                  name: item.catalogItem.name,
                  slug: item.catalogItem.slug,
                  description: item.catalogItem.description,
                  categoryName: item.catalogItem.category.name,
                  thumbnailUrl: resolveCatalogThumbnail(
                    item.catalogItem.slug,
                    item.catalogItem.galleryImages[0]?.imageUrl
                  ),
                },
                avgInstall: avgMap.get(item.catalogItemId) ?? emptyAvgInstallCost(),
              }));

              return (
                <HomeownerProjectCard
                  key={project.id}
                  projectId={project.id}
                  title={project.title}
                  zipCode={project.zipCode}
                  status={project.status}
                  description={project.description}
                  lineItems={lineItems}
                  photos={project.photos.map((p) => ({
                    id: p.id,
                    imageUrl: p.imageUrl,
                    caption: p.caption,
                  }))}
                  suggested={suggested}
                  estimate={estimate}
                  galleryPicks={picksByProjectId.get(project.id) ?? []}
                  comparableBidCount={bidCountByProject.get(project.id) ?? 0}
                />
              );
            })}
          </HomeownerProjectsLayout>
        )}
      </div>
    </div>
  );
}
