import Link from 'next/link';
import AdminContractorApprovalSelect from '@/app/dashboard/admin/AdminContractorApprovalSelect';
import AdminDeleteUserButton from '@/app/dashboard/admin/AdminDeleteUserButton';
import AdminUserRoleSelect from '@/app/dashboard/admin/AdminUserRoleSelect';
import { getSession } from '@/lib/auth';
import { contractorCompanyDisplayName } from '@/lib/contractor-company-name';
import { formatUsdWhole } from '@/lib/format-currency';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export default async function AdminDirectoryPage() {
  const session = await getSession();
  const actorId = session?.userId;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      homeownerProfile: true,
      contractorProfile: true,
      projects: {
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          title: true,
          zipCode: true,
          status: true,
          createdAt: true,
        },
      },
      bids: {
        orderBy: { updatedAt: 'desc' },
        take: 25,
        select: {
          id: true,
          amount: true,
          status: true,
          daysToComplete: true,
          updatedAt: true,
          project: {
            select: { id: true, title: true, zipCode: true, status: true },
          },
        },
      },
      _count: {
        select: {
          projects: true,
          bids: true,
          platformFeedback: true,
        },
      },
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">User directory</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Every account in one place: roles, homeowner and contractor profiles, project and bid
        activity, and moderation actions.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
          <span className="font-semibold text-slate-900">{users.length}</span> users loaded
        </span>
      </div>

      <div className="mt-10 space-y-6">
        {users.map((u) => (
          <section
            key={u.id}
            className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200"
          >
            <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{u.email}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.5 font-semibold text-slate-800">
                      {u.role}
                    </span>
                    <span>User ID: {u.id}</span>
                    <span>Joined {dateFmt.format(u.createdAt)}</span>
                    <span>Updated {dateFmt.format(u.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminUserRoleSelect userId={u.id} value={u.role} />
                  <AdminDeleteUserButton
                    userId={u.id}
                    email={u.email}
                    disabled={actorId != null && u.id === actorId}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Activity
                </div>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  <li>
                    <span className="font-medium text-slate-900">Projects (as homeowner):</span>{' '}
                    {u._count.projects}
                  </li>
                  <li>
                    <span className="font-medium text-slate-900">Bids (as contractor):</span>{' '}
                    {u._count.bids}
                  </li>
                  <li>
                    <span className="font-medium text-slate-900">Platform feedback sent:</span>{' '}
                    {u._count.platformFeedback}
                  </li>
                </ul>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Homeowner profile
                </div>
                {u.homeownerProfile ? (
                  <dl className="mt-2 space-y-1 text-sm text-slate-700">
                    <div>
                      <dt className="inline font-medium text-slate-900">Name:</dt>{' '}
                      <dd className="inline">{u.homeownerProfile.fullName ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-slate-900">Phone:</dt>{' '}
                      <dd className="inline">{u.homeownerProfile.phone ?? '—'}</dd>
                    </div>
                    <div className="text-xs text-slate-500">
                      Profile ID: {u.homeownerProfile.id}
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No homeowner profile.</p>
                )}
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Contractor profile
                </div>
                {u.contractorProfile ? (
                  <div className="mt-2 space-y-3">
                    <dl className="space-y-1 text-sm text-slate-700">
                      <div>
                        <dt className="inline font-medium text-slate-900">Company:</dt>{' '}
                        <dd className="inline">
                          {contractorCompanyDisplayName(u.contractorProfile)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-900">Phone:</dt>{' '}
                        <dd className="inline">{u.contractorProfile.phone ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-900">License:</dt>{' '}
                        <dd className="inline">{u.contractorProfile.licenseNumber ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-900">Insurance doc:</dt>{' '}
                        <dd className="inline">
                          {u.contractorProfile.insuranceDocUrl ? (
                            <a
                              href={u.contractorProfile.insuranceDocUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-sky-700 underline underline-offset-2"
                            >
                              Open link
                            </a>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-900">Service zip codes:</dt>
                        <dd className="mt-0.5">
                          {u.contractorProfile.serviceZipCodes.length > 0
                            ? u.contractorProfile.serviceZipCodes.join(', ')
                            : '—'}
                        </dd>
                      </div>
                      <div className="text-xs text-slate-500">
                        Profile ID: {u.contractorProfile.id}
                      </div>
                    </dl>
                    <div>
                      <div className="text-xs font-semibold text-slate-600">Approval</div>
                      <div className="mt-1">
                        <AdminContractorApprovalSelect
                          userId={u.contractorProfile.userId}
                          value={u.contractorProfile.approvalStatus}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No contractor profile.</p>
                )}
              </div>
            </div>

            {u.projects.length > 0 ? (
              <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Recent projects (this user)
                </div>
                <ul className="mt-3 divide-y divide-slate-100">
                  {u.projects.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                      <Link
                        href={`/dashboard/admin/projects/${p.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {p.title}
                      </Link>
                      <span className="text-xs text-slate-500">
                        {p.zipCode} · {p.status} · {dateFmt.format(p.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
                {u._count.projects > u.projects.length ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Showing {u.projects.length} of {u._count.projects} projects.
                  </p>
                ) : null}
              </div>
            ) : null}

            {u.bids.length > 0 ? (
              <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Recent bids (this user)
                </div>
                <ul className="mt-3 divide-y divide-slate-100">
                  {u.bids.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                      <div>
                        <Link
                          href={`/dashboard/admin/projects/${b.project.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {b.project.title}
                        </Link>
                        <span className="ml-2 text-xs text-slate-500">
                          {b.project.zipCode} · {b.project.status}
                        </span>
                      </div>
                      <span className="text-sm text-slate-700">
                        {formatUsdWhole(Number(b.amount))} · {b.daysToComplete}d · {b.status}
                      </span>
                    </li>
                  ))}
                </ul>
                {u._count.bids > u.bids.length ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Showing {u.bids.length} of {u._count.bids} bids.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
