import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { getPublicOrigin } from '@/lib/public-url';

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/', getPublicOrigin(req)));
  return clearSessionCookie(response);
}