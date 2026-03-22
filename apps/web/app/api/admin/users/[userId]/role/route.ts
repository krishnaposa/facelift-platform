import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { applyUserRoleUpdate, isUserRole } from '@/lib/admin-user-role';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { userId } = await context.params;
    const body = await req.json();
    const role = body?.role;

    if (!isUserRole(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    const result = await applyUserRoleUpdate({
      actorUserId: session.userId,
      targetUserId: userId,
      newRole: role,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ user: result.user });
  } catch (e) {
    console.error('Admin user role PATCH:', e);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}
