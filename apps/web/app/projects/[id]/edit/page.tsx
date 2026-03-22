import SafeImage from '@/app/components/ui/SafeImage';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getGalleryForProject } from '@/lib/project-gallery';
import { getCatalogForWizard } from '@/lib/catalog-wizard';
import { projectItemsToEditLines } from '@/lib/edit-project-lines';
import EditProjectForm from '@/app/components/projects/EditProjectForm';

export const dynamic = 'force-dynamic';

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  const [project, addableCatalogRaw] = await Promise.all([
    prisma.project.findFirst({
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
    }),
    getCatalogForWizard(),
  ]);

  if (!project) {
    notFound();
  }

  const lines = projectItemsToEditLines(project.items);

  const addableCatalog = addableCatalogRaw.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    unitLabel: c.unitLabel,
    categoryName: c.categoryName,
    thumbnailUrl: c.thumbnailUrl,
    optionsSchema: c.optionsSchema,
  }));

  const photoUrls =
    project.photos.length > 0 ? project.photos.map((photo) => photo.imageUrl) : [''];

  const gallery = await getGalleryForProject(project.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto min-w-0 max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {gallery.length > 0 && (
          <div className="mb-8 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Ideas for your project
            </div>
            <p className="mt-2 text-slate-600">
              Gallery matched to your selected upgrades.
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
                    className="h-48 w-full object-cover"
                  />
                  <div className="p-3">
                    {img.catalogItemName && (
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {img.catalogItemName}
                      </div>
                    )}
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {img.title || img.caption || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <EditProjectForm
          projectId={project.id}
          initialTitle={project.title}
          initialZipCode={project.zipCode}
          initialNotes={project.description || ''}
          initialNotesForContractors={project.notesForContractors ?? ''}
          initialPhotos={photoUrls}
          lines={lines}
          addableCatalog={addableCatalog}
        />
      </div>
    </div>
  );
}
