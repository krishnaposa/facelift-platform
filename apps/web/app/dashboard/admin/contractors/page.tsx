import AdminContractorApprovalSelect from '@/app/dashboard/admin/AdminContractorApprovalSelect';
import { contractorCompanyDisplayName } from '@/lib/contractor-company-name';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminContractorsPage() {
  const contractors = await prisma.contractorProfile.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      user: {
        select: { id: true, email: true, createdAt: true },
      },
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Contractors</h1>
      <p className="mt-2 text-slate-600">
        Approve new companies before they can bid or message homeowners. Reject or suspend accounts
        when needed.
      </p>

      <div className="mt-8 overflow-x-auto rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">License</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Approval</th>
            </tr>
          </thead>
          <tbody>
            {contractors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No contractor profiles yet.
                </td>
              </tr>
            ) : (
              contractors.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {contractorCompanyDisplayName(c)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.user.email}</td>
                  <td className="px-4 py-3 text-slate-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.licenseNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(c.user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <AdminContractorApprovalSelect userId={c.userId} value={c.approvalStatus} />
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
