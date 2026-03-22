import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { encryptCompanyName } from '@/lib/contractor-company-name';
import { prisma } from '@/lib/prisma';
import { setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const roleRaw = body?.role;
    const role =
      roleRaw === 'CONTRACTOR' || roleRaw === 'HOMEOWNER' ? roleRaw : 'HOMEOWNER';
    const companyName = String(body?.companyName || '').trim();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    if (role === 'CONTRACTOR' && !companyName) {
      return NextResponse.json(
        { error: 'Company name is required for contractor accounts.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          passwordHash,
          role,
        },
      });

      if (role === 'CONTRACTOR') {
        await tx.contractorProfile.create({
          data: {
            userId: u.id,
            companyName: null,
            companyNameEncrypted: encryptCompanyName(companyName),
            serviceZipCodes: [],
          },
        });
      }

      return u;
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

    return await setSessionCookie(response, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error('Signup error:', error);

    return NextResponse.json(
      { error: 'Failed to create account.' },
      { status: 500 }
    );
  }
}
