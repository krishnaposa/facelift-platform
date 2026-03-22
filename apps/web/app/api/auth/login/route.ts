import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (!existingUser || !existingUser.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, existingUser.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const expectedRole = body?.expectedRole;
    if (
      expectedRole === 'HOMEOWNER' ||
      expectedRole === 'CONTRACTOR' ||
      expectedRole === 'ADMIN'
    ) {
      if (existingUser.role !== expectedRole) {
        const as =
          existingUser.role === 'CONTRACTOR'
            ? 'Contractor'
            : existingUser.role === 'ADMIN'
              ? 'Admin'
              : 'Homeowner';
        const article = as === 'Admin' ? 'an' : 'a';
        return NextResponse.json(
          {
            error: `This email is ${article} ${as.toLowerCase()} account. Select ${as} above to sign in.`,
          },
          { status: 403 }
        );
      }
    }

    const response = NextResponse.json({
      user: {
        id: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      },
    });

    return await setSessionCookie(response, {
      userId: existingUser.id,
      email: existingUser.email,
      role: existingUser.role,
    });
  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      { error: 'Failed to log in.' },
      { status: 500 }
    );
  }
}