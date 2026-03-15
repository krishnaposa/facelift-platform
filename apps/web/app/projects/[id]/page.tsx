import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Description
            </div>
            <p className="mt-4 text-slate-700">
              {project.description || 'No description provided.'}
            </p>
          </div>

          <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Requested Items
            </div>
            <div className="mt-4 space-y-3">
              {project.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
                >
                  <div className="font-semibold text-slate-900">
                    {item.catalogItem.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Quantity: {item.quantity}
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500">
                    {JSON.stringify(item.selectedOptions, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>

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
                  <img
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