import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getGalleryForProject, refreshProjectGalleryPicks } from '@/lib/project-gallery';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/projects/[id]/gallery
 * Returns gallery images automatically matched to this project's items (and optional AI style).
 * Requires authenticated homeowner who owns the project.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(_req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id: projectId } = await context.params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      homeownerId: session.userId,
    },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  try {
    // Refresh persisted picks in the background-ish (awaited for consistency).
    try {
      await refreshProjectGalleryPicks(projectId);
    } catch {
      // ignore until DB is migrated / client generated
    }

    const gallery = await getGalleryForProject(projectId);
    return NextResponse.json({ gallery });
  } catch (error) {
    console.error('Project gallery error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load gallery.' },
      { status: 500 }
    );
  }
}
