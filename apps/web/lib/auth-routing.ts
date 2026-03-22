/**
 * Role types and post-auth redirects — safe to import from Client Components.
 * (Do not import `@/lib/auth` in client components: it uses `next/headers`.)
 */
export type SessionRole = 'HOMEOWNER' | 'CONTRACTOR' | 'ADMIN';

export function dashboardPathForRole(role: SessionRole): string {
  switch (role) {
    case 'CONTRACTOR':
      return '/dashboard/contractor';
    case 'ADMIN':
      return '/dashboard/admin';
    case 'HOMEOWNER':
    default:
      return '/dashboard/homeowner';
  }
}
