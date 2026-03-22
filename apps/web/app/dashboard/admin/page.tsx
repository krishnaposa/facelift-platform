import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const [adminUsers, pendingContractors, openProjects, bidsSubmitted, bidsAccepted] =
    await Promise.all([
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.contractorProfile.count({ where: { approvalStatus: 'PENDING' } }),
      prisma.project.count({ where: { status: 'OPEN' } }),
      prisma.bid.count({ where: { status: 'SUBMITTED' } }),
      prisma.bid.count({ where: { status: 'ACCEPTED' } }),
    ]);

  const cards = [
    {
      label: 'Admin users',
      value: adminUsers,
      href: '/dashboard/admin/users',
      hint: 'Promote by email or change roles in the users table.',
    },
    {
      label: 'Contractors pending review',
      value: pendingContractors,
      href: '/dashboard/admin/contractors',
      hint: 'Approve, reject, or suspend company accounts.',
    },
    {
      label: 'Open projects',
      value: openProjects,
      href: '/dashboard/admin/projects',
      hint: 'Adjust status, copy, or internal admin notes.',
    },
    {
      label: 'Bids submitted',
      value: bidsSubmitted,
      href: '/dashboard/admin/bids',
      hint: 'Moderate or advance bid workflow.',
    },
    {
      label: 'Bids accepted',
      value: bidsAccepted,
      href: '/dashboard/admin/bids',
      hint: 'Track awarded work.',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Overview</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Operate contractor onboarding, bids, and projects when homeowners or contractors need a
        platform-level change.
      </p>

      <Link
        href="/dashboard/admin/directory"
        className="mt-8 block rounded-[28px] border border-slate-900 bg-slate-900 p-6 text-white shadow-sm transition hover:bg-slate-800"
      >
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Full directory
        </div>
        <div className="mt-2 text-xl font-semibold">All users and profiles</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          One page with every account, homeowner and contractor details, projects, bids, and actions.
        </p>
      </Link>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300"
          >
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              {c.label}
            </div>
            <div className="mt-2 text-4xl font-semibold text-slate-900">{c.value}</div>
            <p className="mt-3 text-sm text-slate-600">{c.hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-[28px] bg-slate-900 p-6 text-slate-200">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Admin access
        </div>
        <p className="mt-2 text-sm leading-relaxed">
          Admin accounts are not created via public signup. Use{' '}
          <Link href="/dashboard/admin/users" className="font-semibold text-white underline underline-offset-2">
            Users
          </Link>{' '}
          to promote an existing account to{' '}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-100">ADMIN</code>, then
          sign in with the Admin option on the login page.
        </p>
      </div>
    </div>
  );
}
