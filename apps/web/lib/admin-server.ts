import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import type { SessionPayload } from '@/lib/auth';

export function isAdminSession(session: SessionPayload | null): session is SessionPayload {
  return session?.role === 'ADMIN';
}

/** Use in Server Components / server pages under /dashboard/admin */
export async function requireAdminPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  if (session.role !== 'ADMIN') {
    redirect('/dashboard/homeowner');
  }
  return session;
}
