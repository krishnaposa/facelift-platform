import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { deleteUserAsAdmin } from '@/lib/admin-user-delete';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { userId } = await context.params;

    const result = await deleteUserAsAdmin({
      actorUserId: session.userId,
      targetUserId: userId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin user DELETE:', e);
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  }
}
