import BidComparisonView from '@/app/components/project/BidComparisonView';
import { redirect, notFound } from 'next/navigation';
import {
  buildBidComparisonSnapshot,
  toComparableBidInput,
  type ProjectLineRef,
} from '@/lib/bid-comparison';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const COMPARABLE_STATUSES = ['SUBMITTED', 'SHORTLISTED', 'ACCEPTED'] as const;

export default async function CompareBidsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'ADMIN') {
    redirect('/dashboard/admin');
  }

  if (session.role !== 'HOMEOWNER') {
    redirect('/dashboard/contractor');
  }

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      homeownerId: session.userId,
    },
    include: {
      items: {
        include: {
          catalogItem: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const bids = await prisma.bid.findMany({
    where: {
      projectId: project.id,
      status: { in: [...COMPARABLE_STATUSES] },
    },
    include: {
      lineItems: true,
      contractor: {
        select: {
          email: true,
          contractorProfile: { select: { companyName: true } },
        },
      },
    },
    orderBy: { amount: 'asc' },
  });

  const projectLines: ProjectLineRef[] = project.items.map((i) => ({
    id: i.id,
    name: i.catalogItem.name,
  }));

  const inputs = bids.map(toComparableBidInput);
  const snapshot = buildBidComparisonSnapshot(projectLines, inputs);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <BidComparisonView projectTitle={project.title} projectId={project.id} snapshot={snapshot} />
      </div>
    </div>
  );
}
