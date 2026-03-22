import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminProjectEditForm from '@/app/dashboard/admin/AdminProjectEditForm';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      zipCode: true,
      status: true,
      adminNotes: true,
      homeowner: { select: { email: true } },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard/admin/projects"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← All projects
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {project.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">Homeowner: {project.homeowner.email}</p>
        </div>
      </div>

      <div className="mt-10 max-w-3xl rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Edit project</h2>
        <p className="mt-2 text-sm text-slate-600">
          Use this when a homeowner or contractor needs a correction, or when you are coordinating
          status changes manually.
        </p>
        <div className="mt-8">
          <AdminProjectEditForm
            projectId={project.id}
            initial={{
              title: project.title,
              description: project.description,
              zipCode: project.zipCode,
              status: project.status,
              adminNotes: project.adminNotes ?? null,
            }}
          />
        </div>
      </div>
    </div>
  );
}
