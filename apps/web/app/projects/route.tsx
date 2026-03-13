import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TEMP_HOMEOWNER_ID = 'replace-this-with-a-real-user-id';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const zipCode = String(body?.zipCode || '').trim();
    const selections = body?.selections;

    if (!zipCode) {
      return NextResponse.json({ error: 'Zip code is required.' }, { status: 400 });
    }

    if (!selections || typeof selections !== 'object') {
      return NextResponse.json({ error: 'Selections are required.' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        homeownerId: TEMP_HOMEOWNER_ID,
        zipCode,
        selections,
        status: 'OPEN',
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: 'Failed to create project.' },
      { status: 500 }
    );
  }
}