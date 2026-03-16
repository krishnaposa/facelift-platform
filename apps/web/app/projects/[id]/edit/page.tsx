import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getGalleryForProject } from '@/lib/project-gallery';
import EditProjectForm from '@/app/components/projects/EditProjectForm';

const slugToKeyMap: Record<string, string> = {
  'front-door': 'frontDoor',
  bidets: 'bidets',
  'cabinet-refacing': 'cabinetRefacing',
  'spindles-and-railings': 'spindles',
  'air-vents': 'airVents',
  countertops: 'countertops',
};

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

  const project = await prisma.project.findFirst({
    where: {
      id,
      homeownerId: session.userId,
    },
    include: {
      items: {
        include: {
          catalogItem: true,
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

  const items: Record<string, Record<string, unknown>> = {};

  for (const item of project.items) {
    const key = slugToKeyMap[item.catalogItem.slug];

    if (!key) {
      continue;
    }

    items[key] = {
      selected: true,
      ...(typeof item.selectedOptions === 'object' && item.selectedOptions
        ? item.selectedOptions
        : {}),
      ...(item.quantity > 1 ? { count: item.quantity } : {}),
    };
  }

  const initialForm = {
    title: project.title,
    zipCode: project.zipCode,
    notes: project.description || '',
    photos: project.photos.map((photo) => photo.imageUrl),
    items,
  };

  const gallery = await getGalleryForProject(project.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
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
                  <img
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
        <EditProjectForm projectId={project.id} initialForm={initialForm} />
      </div>
    </div>
  );
}