import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 120,
    select: {
      id: true,
      title: true,
      zipCode: true,
      status: true,
      updatedAt: true,
      homeowner: { select: { email: true } },
      _count: { select: { bids: true, items: true } },
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Projects</h1>
      <p className="mt-2 text-slate-600">
        Update titles, descriptions, zip codes, workflow status, and internal admin notes when
        parties need help fixing data or moving a job forward.
      </p>

      <div className="mt-8 overflow-x-auto rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-[800px] w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Homeowner</th>
              <th className="px-4 py-3">Zip</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Bids</th>
              <th className="px-4 py-3">Lines</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No projects yet.
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/admin/projects/${p.id}`}
                      className="font-semibold text-slate-900 hover:underline"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.homeowner.email}</td>
                  <td className="px-4 py-3 text-slate-600">{p.zipCode}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p._count.bids}</td>
                  <td className="px-4 py-3 text-slate-600">{p._count.items}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(p.updatedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
