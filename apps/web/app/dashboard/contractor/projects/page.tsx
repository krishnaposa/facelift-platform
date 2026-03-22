import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { contractorApprovalBlockReason } from '@/lib/contractor-approval';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ContractorOpenProjectsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'ADMIN') {
    redirect('/dashboard/admin');
  }

  if (session.role !== 'CONTRACTOR') {
    redirect('/dashboard/homeowner');
  }

  const approvalLock = await contractorApprovalBlockReason(session.userId);

  const projects = await prisma.project.findMany({
    where: { status: 'OPEN' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      zipCode: true,
      description: true,
      status: true,
      createdAt: true,
      _count: { select: { items: true, photos: true } },
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Open projects
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Browse work
            </h1>
            <p className="mt-2 text-slate-600">
              Homeowner projects accepting bids. Open a project to review scope and line items.
            </p>
          </div>
          <Link
            href="/dashboard/contractor"
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
          >
            Dashboard
          </Link>
        </div>

        {approvalLock ? (
          <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100">
            {approvalLock}
          </div>
        ) : null}

        {projects.length === 0 ? (
          <div className="mt-10 rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-600">No open projects right now. Check back soon.</p>
          </div>
        ) : (
          <ul className="mt-10 space-y-4">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/contractor/projects/${p.id}`}
                  className="block rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{p.title}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {p.zipCode} • {p._count.items} line item{p._count.items === 1 ? '' : 's'} •{' '}
                        {p._count.photos} photo{p._count.photos === 1 ? '' : 's'}
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                      {p.status}
                    </span>
                  </div>
                  {p.description ? (
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">{p.description}</p>
                  ) : null}
                  <div className="mt-4 text-sm font-semibold text-slate-900">View scope →</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
