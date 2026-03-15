import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import EditProjectForm from '@/components/projects/EditProjectForm';

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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <EditProjectForm projectId={project.id} initialForm={initialForm} />
      </div>
    </div>
  );
}