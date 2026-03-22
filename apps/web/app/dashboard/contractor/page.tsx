import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { contractorCompanyDisplayName } from '@/lib/contractor-company-name';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ContractorDashboardPage() {
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

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: session.userId },
    select: { companyName: true, companyNameEncrypted: true, approvalStatus: true },
  });

  const openProjects = await prisma.project.count({
    where: { status: 'OPEN' },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Contractor dashboard
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
          {contractorCompanyDisplayName(profile)}
        </h1>
        <p className="mt-2 text-slate-600">{session.email}</p>
        {profile?.approvalStatus ? (
          <p className="mt-1 text-sm text-slate-500">
            Account status: <span className="font-medium">{profile.approvalStatus}</span>
          </p>
        ) : null}
      </div>

      {profile && profile.approvalStatus !== 'APPROVED' ? (
        <div
          className={`mt-8 rounded-2xl px-4 py-3 text-sm ring-1 ${
            profile.approvalStatus === 'PENDING'
              ? 'bg-amber-50 text-amber-950 ring-amber-100'
              : 'bg-red-50 text-red-900 ring-red-100'
          }`}
        >
          {profile.approvalStatus === 'PENDING'
            ? 'Your company profile is pending admin approval. You can browse open projects, but bidding and messaging stay off until you are approved.'
            : profile.approvalStatus === 'REJECTED'
              ? 'Your contractor application was not approved. Contact support if you need help.'
              : 'Your contractor account is suspended. Bidding and messaging are disabled.'}
        </div>
      ) : null}

      <div className="mt-10 rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Find work</h2>
        <p className="mt-2 text-slate-600">
          Browse open homeowner projects and place bids on full projects or individual line items.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {openProjects} open project{openProjects === 1 ? '' : 's'} available right now.
        </p>
        <Link
          href="/dashboard/contractor/projects"
          className="mt-6 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        >
          View open projects
        </Link>
      </div>

      <p className="mt-8 text-sm text-slate-500">
        <Link href="/" className="font-semibold text-slate-700 hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
