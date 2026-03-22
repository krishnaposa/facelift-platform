import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function ContractorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/dashboard/contractor" className="leading-tight">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Facelift
              </div>
              <div className="text-lg font-semibold text-slate-900">Contractor</div>
            </Link>
            <nav className="flex flex-wrap gap-1">
              <Link
                href="/dashboard/contractor"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/contractor/projects"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Open projects
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[200px] truncate text-sm text-slate-500 sm:inline">
              {session.email}
            </span>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
