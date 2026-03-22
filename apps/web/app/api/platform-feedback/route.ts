import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

const CATEGORIES = [
  'BUG',
  'FEATURE_REQUEST',
  'ACCOUNT',
  'BILLING',
  'PROJECT_ISSUE',
  'OTHER',
] as const;

type FeedbackCategory = (typeof CATEGORIES)[number];

const MAX_BODY = 12_000;
const MAX_SUBJECT = 200;

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    if (session.role !== 'HOMEOWNER' && session.role !== 'CONTRACTOR') {
      return NextResponse.json({ error: 'Only homeowners and contractors can submit feedback.' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const rawCat = body?.category;
    const category: FeedbackCategory =
      typeof rawCat === 'string' && (CATEGORIES as readonly string[]).includes(rawCat)
        ? (rawCat as FeedbackCategory)
        : 'OTHER';
    const subject =
      typeof body?.subject === 'string' ? body.subject.trim().slice(0, MAX_SUBJECT) || null : null;
    const text = typeof body?.body === 'string' ? body.body.trim() : '';
    const projectIdRaw = body?.projectId;

    if (text.length < 10) {
      return NextResponse.json({ error: 'Please enter at least a short description (10+ characters).' }, { status: 400 });
    }
    if (text.length > MAX_BODY) {
      return NextResponse.json({ error: 'Message is too long.' }, { status: 400 });
    }

    let projectId: string | null = null;
    if (projectIdRaw != null && projectIdRaw !== '') {
      if (typeof projectIdRaw !== 'string') {
        return NextResponse.json({ error: 'Invalid project reference.' }, { status: 400 });
      }
      if (session.role === 'HOMEOWNER') {
        const ok = await prisma.project.findFirst({
          where: { id: projectIdRaw, homeownerId: session.userId },
          select: { id: true },
        });
        if (!ok) {
          return NextResponse.json({ error: 'That project is not yours.' }, { status: 400 });
        }
        projectId = projectIdRaw;
      } else {
        const ok = await prisma.bid.findFirst({
          where: { projectId: projectIdRaw, contractorId: session.userId },
          select: { id: true },
        });
        if (!ok) {
          return NextResponse.json(
            { error: 'You can only link feedback to projects you have bid on.' },
            { status: 400 }
          );
        }
        projectId = projectIdRaw;
      }
    }

    const row = await prisma.platformFeedback.create({
      data: {
        userId: session.userId,
        category,
        subject,
        body: text,
        projectId,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: row.id, ok: true });
  } catch (e) {
    console.error('POST platform-feedback:', e);
    return NextResponse.json({ error: 'Could not save feedback.' }, { status: 500 });
  }
}
