import type { NextRequest } from 'next/server';

/**
 * Public site origin for redirects and email links behind reverse proxies (e.g. Azure App Service),
 * where `req.url` / `nextUrl` may still show `localhost`.
 *
 * Set **`APP_URL`** (or **`NEXT_PUBLIC_APP_URL`**) to your canonical URL if forwarded headers are missing.
 */
export function getPublicOrigin(req: NextRequest): string {
  const fromEnv =
    process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    try {
      const u = new URL(fromEnv);
      return `${u.protocol}//${u.host}`;
    } catch {
      /* ignore invalid env */
    }
  }

  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  if (forwardedHost) {
    const rawProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const proto =
      rawProto === 'http' || rawProto === 'https' ? rawProto : 'https';
    return `${proto}://${forwardedHost}`;
  }

  return req.nextUrl.origin;
}
