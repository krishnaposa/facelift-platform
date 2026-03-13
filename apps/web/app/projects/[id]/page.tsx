import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Project
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {project.id}
          </h1>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-500">Zip Code</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {project.zipCode}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-500">Status</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {project.status}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-sm font-semibold text-slate-500">Selections JSON</div>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-slate-800">
              {JSON.stringify(project.selections, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}