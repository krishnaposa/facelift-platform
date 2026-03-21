import Link from 'next/link';
import SafeImage from '@/app/components/ui/SafeImage';
import HomeownerProjectCard from '@/app/dashboard/homeowner/HomeownerProjectCard';
import { redirect } from 'next/navigation';
import {
  emptyAvgInstallCost,
  getAverageBidLineAmountByCatalogItem,
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
import { refreshProjectGalleryPicks, refreshUserGalleryPicks } from '@/lib/project-gallery';

export default async function HomeownerDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'HOMEOWNER') {
    redirect('/login');
  }

  const [projects, allCatalogRows, avgMap] = await Promise.all([
    prisma.project.findMany({
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
    }),
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
    getAverageBidLineAmountByCatalogItem(),
  ]);

  const catalogEnriched = enrichCatalogForDashboard(allCatalogRows, avgMap);

  // If the user has projects, ensure each has persisted picks (best-effort).
  if (projects.length > 0) {
    await Promise.allSettled(projects.slice(0, 12).map((p) => refreshProjectGalleryPicks(p.id)));
  } else {
    // If there are no projects yet, create a user-level AI gallery feed and persist it.
    try {
      await refreshUserGalleryPicks(session.userId);
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
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Homeowner Dashboard
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
              My Projects
            </h1>
            <p className="mt-2 text-slate-600">{session.email}</p>
          </div>

          <div className="flex gap-3">
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
                <div className="mt-3 grid grid-cols-3 gap-4">
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
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
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
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
