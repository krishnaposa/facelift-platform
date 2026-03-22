import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();

  const nav = [
    { href: '/dashboard/admin', label: 'Overview' },
    { href: '/dashboard/admin/directory', label: 'Directory' },
    { href: '/dashboard/admin/users', label: 'Users' },
    { href: '/dashboard/admin/contractors', label: 'Contractors' },
    { href: '/dashboard/admin/bids', label: 'Bids' },
    { href: '/dashboard/admin/projects', label: 'Projects' },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Facelift
              </div>
              <div className="text-lg font-semibold text-slate-900">Admin</div>
            </div>
            <nav className="flex flex-wrap gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{session.email}</span>
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
