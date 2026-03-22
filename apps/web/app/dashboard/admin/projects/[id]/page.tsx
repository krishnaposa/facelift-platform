import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminProjectEditForm from '@/app/dashboard/admin/AdminProjectEditForm';
import AdminProjectItemsSection from '@/app/dashboard/admin/AdminProjectItemsSection';
import { getCatalogForWizard } from '@/lib/catalog-wizard';
import { projectItemsToEditLines } from '@/lib/edit-project-lines';
import { prisma } from '@/lib/prisma';
import type { AddableCatalogEntry } from '@/lib/edit-project-types';

export const dynamic = 'force-dynamic';

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      homeowner: { select: { email: true } },
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
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const catalogWizard = await getCatalogForWizard();

  const addableCatalog: AddableCatalogEntry[] = catalogWizard.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    unitLabel: c.unitLabel,
    categoryName: c.categoryName,
    thumbnailUrl: c.thumbnailUrl,
    optionsSchema: c.optionsSchema,
  }));

  const initialLines = projectItemsToEditLines(project.items);

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

      <div className="mt-10 max-w-3xl rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Line items (catalog)</h2>
          <p className="mt-2 text-sm text-slate-600">
            Add, remove, or reconfigure upgrades the same way homeowners do. This replaces all project
            line items when you save.
          </p>
          <div className="mt-8">
            <AdminProjectItemsSection
              projectId={project.id}
              initialLines={initialLines}
              addableCatalog={addableCatalog}
            />
          </div>
        </div>
    </div>
  );
}
