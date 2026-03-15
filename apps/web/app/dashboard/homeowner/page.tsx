import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export default async function HomeownerDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
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
          catalogItem: true,
        },
      },
      photos: true,
    },
  });

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
            <h2 className="text-2xl font-semibold text-slate-900">
              No projects yet
            </h2>
            <p className="mt-2 text-slate-600">
              Create your first facelift project to start getting bids.
            </p>
            <Link
              href="/projects/new"
              className="mt-6 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
            >
              Create Project
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">
                      {project.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {project.zipCode}
                    </div>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {project.status}
                  </span>
                </div>

                <div className="mt-4 text-sm text-slate-600">
                  {project.description || 'No description yet.'}
                </div>

                <div className="mt-4 text-sm text-slate-500">
                  {project.items.length} item{project.items.length === 1 ? '' : 's'}
                  {' • '}
                  {project.photos.length} photo{project.photos.length === 1 ? '' : 's'}
                </div>

                <div className="mt-6 flex gap-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
                  >
                    View
                  </Link>

                  <Link
                    href={`/projects/${project.id}/edit`}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}