import Link from 'next/link';
import AdminBidStatusSelect from '@/app/dashboard/admin/AdminBidStatusSelect';
import { formatUsdWhole } from '@/lib/format-currency';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminBidsPage() {
  const bids = await prisma.bid.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 150,
    include: {
      contractor: {
        select: {
          email: true,
          contractorProfile: { select: { companyName: true } },
        },
      },
      project: {
        select: {
          id: true,
          title: true,
          zipCode: true,
          status: true,
          homeowner: { select: { email: true } },
        },
      },
      _count: { select: { lineItems: true } },
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Bids</h1>
      <p className="mt-2 text-slate-600">
        Review contractor offers. Adjust status for moderation, shortlists, or when a homeowner
        awards work outside the self-serve flow.
      </p>

      <div className="mt-8 overflow-x-auto rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Homeowner</th>
              <th className="px-4 py-3">Contractor</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Lines</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bids.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No bids yet.
                </td>
              </tr>
            ) : (
              bids.map((b) => {
                const co =
                  b.contractor.contractorProfile?.companyName ?? b.contractor.email;
                return (
                  <tr key={b.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/admin/projects/${b.project.id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {b.project.title}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {b.project.zipCode} · {b.project.status}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.project.homeowner.email}</td>
                    <td className="px-4 py-3 text-slate-600">{co}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatUsdWhole(Number(b.amount))}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.daysToComplete}</td>
                    <td className="px-4 py-3 text-slate-600">{b._count.lineItems}</td>
                    <td className="px-4 py-3">
                      <AdminBidStatusSelect bidId={b.id} value={b.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
