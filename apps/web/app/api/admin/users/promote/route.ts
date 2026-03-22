import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { applyUserRoleUpdate, isUserRole } from '@/lib/admin-user-role';

/**
 * Promote / change role by email (lookup). Same rules as PATCH .../role.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = body?.role;

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    if (!isUserRole(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account with that email. The user must sign up first.' },
        { status: 404 }
      );
    }

    const result = await applyUserRoleUpdate({
      actorUserId: session.userId,
      targetUserId: user.id,
      newRole: role,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ user: result.user });
  } catch (e) {
    console.error('Admin promote POST:', e);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}
