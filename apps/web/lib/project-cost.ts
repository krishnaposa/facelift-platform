import { prisma } from '@/lib/prisma';
import { getAzureOpenAI, isAzureOpenAIConfigured } from '@/lib/azure-openai';

export type ProjectCostEstimate = {
  hasData: boolean;
  average: number | null;
  min: number | null;
  max: number | null;
  count: number;
  explanation: string | null;
};

export async function getProjectCostEstimate(projectId: string): Promise<ProjectCostEstimate> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      zipCode: true,
      title: true,
      items: {
        include: {
          catalogItem: true,
        },
      },
    },
  });

  if (!project) {
    return {
      hasData: false,
      average: null,
      min: null,
      max: null,
      count: 0,
      explanation: null,
    };
  }

  const stats = await prisma.bid.aggregate({
    where: {
      project: {
        zipCode: project.zipCode,
      },
    },
    _avg: { amount: true },
    _min: { amount: true },
    _max: { amount: true },
    _count: { _all: true },
  });

  const avg = stats._avg.amount ? Number(stats._avg.amount) : null;
  const min = stats._min.amount ? Number(stats._min.amount) : null;
  const max = stats._max.amount ? Number(stats._max.amount) : null;
  const count = stats._count._all ?? 0;

  if (!avg || count === 0) {
    return {
      hasData: false,
      average: null,
      min: null,
      max: null,
      count,
      explanation: null,
    };
  }

  let explanation: string | null = null;

  if (isAzureOpenAIConfigured()) {
    try {
      const client = getAzureOpenAI();
      if (client) {
        const upgrades = project.items.map((i) => i.catalogItem.name).join(', ');
        const prompt = [
          `Project: ${project.title}`,
          `Zip code: ${project.zipCode}`,
          `Upgrades: ${upgrades}`,
          `Based on ${count} bids in this zip:`,
          `Average total bid: $${avg.toFixed(0)}`,
          min && max ? `Range: $${min.toFixed(0)} - $${max.toFixed(0)}` : '',
          '',
          'Explain this estimate to a homeowner in one short sentence.',
        ]
          .filter(Boolean)
          .join('\n');

        const completion = await client.chat.completions.create({
          model: '',
          messages: [
            {
              role: 'system',
              content:
                'You explain renovation cost estimates clearly and conservatively to homeowners. Keep answers under 1–2 short sentences.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 80,
        });

        const text = completion.choices?.[0]?.message?.content?.trim() ?? '';
        if (text) {
          explanation = text;
        }
      }
    } catch {
      explanation = null;
    }
  }

  return {
    hasData: true,
    average: avg,
    min,
    max,
    count,
    explanation,
  };
}

