import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAzureOpenAI, isAzureOpenAIConfigured } from '@/lib/azure-openai';

export type EstimateExplainer = {
  summary: string;
  bullets: string[];
  /** How the numbers were computed — always grounded in real stats. */
  sourceNote: string;
};

export type ProjectCostEstimate = {
  hasData: boolean;
  average: number | null;
  min: number | null;
  max: number | null;
  count: number;
  /** @deprecated Prefer `explainer.summary` — kept for callers that only need one string. */
  explanation: string | null;
  explainer: EstimateExplainer | null;
};

function buildSourceNote(zip: string, count: number): string {
  return `Based on ${count} past contractor bid total${count === 1 ? '' : 's'} in zip ${zip}. This benchmarks whole-project bid amounts others paid in your area—not a quote for your exact scope.`;
}

function buildDeterministicExplainer(params: {
  zip: string;
  count: number;
  avg: number;
  min: number | null;
  max: number | null;
  upgradeNames: string[];
  hasLineNotes: boolean;
}): EstimateExplainer {
  const { zip, count, avg, min, max, upgradeNames, hasLineNotes } = params;
  const sourceNote = buildSourceNote(zip, count);

  const summary = `Typical total project bids in ${zip} center around $${avg.toFixed(0)} from the marketplace history we have for that area.`;

  const listLabel =
    upgradeNames.length > 0
      ? upgradeNames.slice(0, 6).join(', ') + (upgradeNames.length > 6 ? ', …' : '')
      : 'your selected upgrades';

  const bullets: string[] = [
    `Contractors bid each line item separately; this $${avg.toFixed(
      0
    )} figure is an average of entire project bid totals in ${zip}, not a sum of your catalog lines.`,
    `Your scope (${listLabel}) may be simpler or more involved than those past jobs, so your bids can land above or below this benchmark.`,
  ];

  if (min != null && max != null) {
    bullets.push(
      `In this zip, recorded bid totals ranged from $${min.toFixed(0)} to $${max.toFixed(0)}. Unusual layouts, code upgrades, or premium finishes often push toward the higher end.`
    );
  }

  if (hasLineNotes) {
    bullets.push(
      `You left notes on one or more upgrades—if they add labor or materials beyond a standard install, expect line-item prices (and totals) to reflect that.`
    );
  }

  bullets.push(
    `Use this range to sanity-check proposals you receive—not as a cap, floor, or guarantee.`
  );

  return { summary, bullets, sourceNote };
}

function parseExplainerJson(raw: string): Pick<EstimateExplainer, 'summary' | 'bullets'> | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as {
      summary?: unknown;
      bullets?: unknown;
    };
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets
          .filter((b): b is string => typeof b === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];
    if (!summary || bullets.length === 0) return null;
    return { summary, bullets };
  } catch {
    return null;
  }
}

async function tryAiExplainer(params: {
  projectTitle: string;
  zip: string;
  count: number;
  avg: number;
  min: number | null;
  max: number | null;
  upgradeNames: string[];
  lineNotesBlock: string;
}): Promise<Pick<EstimateExplainer, 'summary' | 'bullets'> | null> {
  if (!isAzureOpenAIConfigured()) return null;

  const client = getAzureOpenAI();
  if (!client) return null;

  const statsLines = [
    `Zip: ${params.zip}`,
    `Number of past bid totals in data: ${params.count}`,
    `Average of those bid totals: $${params.avg.toFixed(0)}`,
    params.min != null && params.max != null
      ? `Min / max bid total in this zip: $${params.min.toFixed(0)} – $${params.max.toFixed(0)}`
      : '',
    `Homeowner upgrade selections: ${params.upgradeNames.join(', ') || '(none listed)'}`,
    params.lineNotesBlock ? `Homeowner notes per upgrade:\n${params.lineNotesBlock}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const userPrompt = [
    statsLines,
    '',
    'The dollar figures above are the ONLY financial numbers you may reference. Do not invent amounts.',
    '',
    'Return ONLY valid JSON (no markdown fences) with this exact shape:',
    '{"summary":"2-3 sentences explaining what this benchmark means for a homeowner.","bullets":["short point 1","short point 2","short point 3","optional 4"]}',
    '',
    'Rules:',
    '- Clarify that the average is from past whole-project bid totals in this zip, not a quote for their line items.',
    '- Mention that their actual bids depend on scope, materials, and site conditions.',
    '- If notes suggest premium or complex work, say bids may run higher—without changing the numeric average.',
    '- Bullets: 3–4 items, each under 220 characters, plain text (no markdown).',
  ].join('\n');

  try {
    const completion = await client.chat.completions.create({
      model: '',
      messages: [
        {
          role: 'system',
          content:
            'You help homeowners understand renovation bid benchmarks. Be accurate, conservative, and never give legal or tax advice. Output JSON only.',
        },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.4,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() ?? '';
    return parseExplainerJson(raw);
  } catch {
    return null;
  }
}

export async function getProjectCostEstimate(projectId: string): Promise<ProjectCostEstimate> {
  noStore();
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
      explainer: null,
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
      explainer: null,
    };
  }

  const upgradeNames = project.items.map((i) => i.catalogItem.name);
  const lineNotesBlock = project.items
    .map((i) => {
      const n = typeof i.notes === 'string' ? i.notes.trim() : '';
      return n ? `${i.catalogItem.name}: ${n.slice(0, 400)}` : null;
    })
    .filter(Boolean)
    .join('\n');
  const hasLineNotes = lineNotesBlock.length > 0;

  const deterministic = buildDeterministicExplainer({
    zip: project.zipCode.trim(),
    count,
    avg,
    min,
    max,
    upgradeNames,
    hasLineNotes,
  });

  let explainer: EstimateExplainer = deterministic;

  const aiParts = await tryAiExplainer({
    projectTitle: project.title,
    zip: project.zipCode.trim(),
    count,
    avg,
    min,
    max,
    upgradeNames,
    lineNotesBlock,
  });

  if (aiParts) {
    explainer = {
      summary: aiParts.summary,
      bullets: aiParts.bullets,
      sourceNote: buildSourceNote(project.zipCode.trim(), count),
    };
  }

  return {
    hasData: true,
    average: avg,
    min,
    max,
    count,
    explanation: explainer.summary,
    explainer,
  };
}

export type UsaCostEstimate = {
  hasData: boolean;
  average: number | null;
  min: number | null;
  max: number | null;
  count: number;
};

/**
 * Average bid cost across all bids in the system (USA-wide).
 * No zip filtering.
 */
export async function getUSAAverageBidEstimate(): Promise<UsaCostEstimate> {
  const stats = await prisma.bid.aggregate({
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
    return { hasData: false, average: null, min: null, max: null, count };
  }

  return { hasData: true, average: avg, min, max, count };
}
