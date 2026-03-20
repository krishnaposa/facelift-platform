import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/', req.url));
  return clearSessionCookie(response);
}