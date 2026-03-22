import AdminDeleteUserButton from '@/app/dashboard/admin/AdminDeleteUserButton';
import AdminUserRoleSelect from '@/app/dashboard/admin/AdminUserRoleSelect';
import PromoteUserForm from '@/app/dashboard/admin/PromoteUserForm';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const session = await getSession();
  const actorId = session?.userId;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      contractorProfile: { select: { approvalStatus: true, companyName: true } },
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Users &amp; roles</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Promote accounts to admin, or switch roles when someone needs access fixed. You cannot remove your
        own admin role if you are the only admin. <strong>Delete</strong> permanently removes the account,
        their homeowner projects, contractor bids, and related messages.
      </p>

      <div className="mt-10 rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Promote by email</h2>
        <p className="mt-2 text-sm text-slate-600">
          Enter the exact signup email and choose a role. Use this to grant <strong>ADMIN</strong> without
          database access.
        </p>
        <div className="mt-6">
          <PromoteUserForm />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">All users ({users.length})</h2>
        <div className="mt-4 overflow-x-auto rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-[800px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Contractor</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 w-[100px]"> </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No users.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{u.email}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.contractorProfile ? (
                        <span title={u.contractorProfile.companyName}>
                          {u.contractorProfile.approvalStatus}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AdminUserRoleSelect userId={u.id} value={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <AdminDeleteUserButton
                        userId={u.id}
                        email={u.email}
                        disabled={actorId != null && u.id === actorId}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
