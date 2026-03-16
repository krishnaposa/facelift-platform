/**
 * Automatic gallery pull for a project: returns GalleryImages that match
 * the project's catalog items. Optionally uses Microsoft AI (Azure OpenAI)
 * to derive style tags from project title, description, and photos context,
 * then filters/ranks gallery by those tags.
 */
import { prisma } from '@/lib/prisma';
import { getAzureOpenAI, isAzureOpenAIConfigured } from '@/lib/azure-openai';

export type GalleryImageForProject = {
  id: string;
  imageUrl: string;
  title: string | null;
  caption: string | null;
  styleTag: string | null;
  catalogItemName: string | null;
  catalogItemSlug: string | null;
};

export type ProjectGalleryPickRow = {
  projectId: string;
  galleryImageId: string;
  rank: number;
  keywords: string[];
  aiReason: string | null;
};

export type UserGalleryPickRow = {
  userId: string;
  galleryImageId: string;
  rank: number;
  keywords: string[];
  aiReason: string | null;
};

/**
 * Derive style tags from project context using Azure OpenAI (if configured).
 * Returns a short list of lowercase tags, e.g. ["modern", "minimalist", "bright"].
 */
async function getStyleTagsFromAI(
  title: string,
  description: string | null,
  catalogItemNames: string[]
): Promise<string[]> {
  const client = getAzureOpenAI();
  if (!client || !isAzureOpenAIConfigured()) return [];

  const text = [title, description, catalogItemNames.join(', ')].filter(Boolean).join('\n');
  if (!text.trim()) return [];

  try {
    const completion = await client.chat.completions.create({
      model: '',
      messages: [
        {
          role: 'system',
          content:
            'You are a home design assistant. Given a project title, description, and upgrade types, output 3 to 5 single-word style or aesthetic tags that describe the likely look (e.g. modern, traditional, minimalist, cozy, bright, industrial). Output only a comma-separated list of lowercase tags, nothing else.',
        },
        {
          role: 'user',
          content: text.slice(0, 2000),
        },
      ],
      max_tokens: 80,
    });

    const content = completion.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) return [];

    return content
      .split(/[\s,]+/)
      .map((s) => s.toLowerCase().replace(/[^a-z0-9-]/g, ''))
      .filter(Boolean)
      .slice(0, 5);
  } catch {
    return [];
  }
}

function normalizeKeywords(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out = input
    .map((k) => (typeof k === 'string' ? k : ''))
    .map((k) => k.trim().toLowerCase())
    .map((k) => k.replace(/[^a-z0-9- ]/g, '').trim())
    .filter(Boolean)
    .flatMap((k) => k.split(/\s+/))
    .filter(Boolean);
  return [...new Set(out)].slice(0, 12);
}

async function pickAndKeywordGalleryWithAI(args: {
  projectTitle: string;
  projectDescription: string | null;
  catalogItemNames: string[];
  candidates: Array<{
    id: string;
    title: string | null;
    caption: string | null;
    styleTag: string | null;
    catalogItemName: string | null;
  }>;
  maxPicks: number;
}): Promise<Array<{ galleryImageId: string; rank: number; keywords: string[]; aiReason: string | null }>> {
  const client = getAzureOpenAI();
  if (!client || !isAzureOpenAIConfigured()) return [];

  const payload = {
    project: {
      title: args.projectTitle,
      description: args.projectDescription,
      upgradeTypes: args.catalogItemNames,
    },
    candidates: args.candidates.map((c) => ({
      id: c.id,
      title: c.title,
      caption: c.caption,
      styleTag: c.styleTag,
      catalogItemName: c.catalogItemName,
    })),
    maxPicks: args.maxPicks,
  };

  try {
    const completion = await client.chat.completions.create({
      model: '',
      messages: [
        {
          role: 'system',
          content:
            'You help curate home renovation inspiration. Choose the best gallery images for the project from the provided candidates, then generate searchable keywords per chosen image. Output ONLY valid JSON: { "picks": [ { "id": "<candidate id>", "rank": 1, "keywords": ["..."], "reason": "..." } ] }. Keywords should be short (1-2 words each), lowercase, and useful for search (style, colors, finishes, vibe). Return at most maxPicks picks.',
        },
        {
          role: 'user',
          content: JSON.stringify(payload).slice(0, 12000),
        },
      ],
      max_tokens: 700,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() ?? '';
    if (!raw) return [];

    const parsed = JSON.parse(raw) as { picks?: Array<{ id?: unknown; rank?: unknown; keywords?: unknown; reason?: unknown }> };
    const picks = Array.isArray(parsed?.picks) ? parsed.picks : [];

    const cleaned = picks
      .map((p) => ({
        galleryImageId: typeof p.id === 'string' ? p.id : '',
        rank: typeof p.rank === 'number' && Number.isFinite(p.rank) ? p.rank : 999,
        keywords: normalizeKeywords(p.keywords),
        aiReason: typeof p.reason === 'string' ? p.reason : null,
      }))
      .filter((p) => !!p.galleryImageId)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, args.maxPicks);

    return cleaned;
  } catch {
    return [];
  }
}

/**
 * Returns gallery images that match the project's items (and optionally AI-derived style).
 * Ordered by catalog item order and then by gallery image creation.
 */
export async function getGalleryForProject(projectId: string): Promise<GalleryImageForProject[]> {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    include: {
      items: {
        include: {
          catalogItem: true,
        },
      },
      photos: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!project) return [];

  const catalogItemIds = project.items.map((i) => i.catalogItemId);
  if (catalogItemIds.length === 0) return [];

  const catalogNames = [...new Set(project.items.map((i) => i.catalogItem.name))];
  const styleTags = await getStyleTagsFromAI(
    project.title,
    project.description ?? null,
    catalogNames
  );

  const galleryImages = await prisma.galleryImage.findMany({
    where: {
      isPublic: true,
      catalogItemId: { in: catalogItemIds },
    },
    include: {
      catalogItem: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const result: GalleryImageForProject[] = galleryImages.map((img) => ({
    id: img.id,
    imageUrl: img.imageUrl,
    title: img.title,
    caption: img.caption,
    styleTag: img.styleTag,
    catalogItemName: img.catalogItem?.name ?? null,
    catalogItemSlug: img.catalogItem?.slug ?? null,
  }));

  // If we have AI style tags, prefer images whose styleTag contains any of them
  if (styleTags.length > 0 && result.length > 1) {
    const tagSet = new Set(styleTags);
    const matchesTag = (styleTag: string | null) =>
      !!styleTag &&
      styleTag
        .toLowerCase()
        .split(/[\s,]+/)
        .some((t) => tagSet.has(t.trim()));
    result.sort((a, b) => {
      const aMatch = matchesTag(a.styleTag);
      const bMatch = matchesTag(b.styleTag);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }

  return result;
}

/**
 * Generate (or refresh) persisted AI gallery picks for a project.
 * Saves into ProjectGalleryPick with keywords for search.
 *
 * Note: uses `any` for prisma access so the app can compile before running
 * Prisma migrate/generate in local environments.
 */
export async function refreshProjectGalleryPicks(projectId: string): Promise<ProjectGalleryPickRow[]> {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    include: {
      items: { include: { catalogItem: true } },
      photos: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!project) return [];

  const catalogItemIds = project.items.map((i) => i.catalogItemId);
  if (catalogItemIds.length === 0) return [];

  const galleryImages = await prisma.galleryImage.findMany({
    where: { isPublic: true, catalogItemId: { in: catalogItemIds } },
    include: { catalogItem: true },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  if (galleryImages.length === 0) return [];

  const catalogNames = [...new Set(project.items.map((i) => i.catalogItem.name))];
  const candidates = galleryImages.map((img) => ({
    id: img.id,
    title: img.title,
    caption: img.caption,
    styleTag: img.styleTag,
    catalogItemName: img.catalogItem?.name ?? null,
  }));

  const maxPicks = 12;

  const aiPicks = await pickAndKeywordGalleryWithAI({
    projectTitle: project.title,
    projectDescription: project.description ?? null,
    catalogItemNames: catalogNames,
    candidates,
    maxPicks,
  });

  const fallback = galleryImages.slice(0, maxPicks).map((img, idx) => ({
    galleryImageId: img.id,
    rank: idx + 1,
    keywords: normalizeKeywords([
      img.styleTag ?? '',
      img.catalogItem?.slug ?? '',
      img.catalogItem?.name ?? '',
    ]),
    aiReason: null as string | null,
  }));

  const picks = aiPicks.length > 0 ? aiPicks : fallback;

  // Persist (delete old + insert new) so rank stays consistent.
  await prisma.$transaction(async (tx) => {
    await (tx as any).projectGalleryPick?.deleteMany?.({ where: { projectId } });
    await (tx as any).projectGalleryPick?.createMany?.({
      data: picks.map((p) => ({
        projectId,
        galleryImageId: p.galleryImageId,
        rank: p.rank,
        keywords: p.keywords,
        aiReason: p.aiReason,
      })),
    });
  });

  return picks.map((p) => ({
    projectId,
    galleryImageId: p.galleryImageId,
    rank: p.rank,
    keywords: p.keywords,
    aiReason: p.aiReason,
  }));
}

/**
 * Generate (or refresh) global AI gallery picks for a user when they have no projects.
 * Saves into UserGalleryPick with keywords for search.
 */
export async function refreshUserGalleryPicks(userId: string): Promise<UserGalleryPickRow[]> {
  const galleryImages = await prisma.galleryImage.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: { catalogItem: true },
  });

  if (galleryImages.length === 0) return [];

  const candidates = galleryImages.map((img) => ({
    id: img.id,
    title: img.title,
    caption: img.caption,
    styleTag: img.styleTag,
    catalogItemName: img.catalogItem?.name ?? null,
  }));

  const maxPicks = 12;

  const aiPicks = await pickAndKeywordGalleryWithAI({
    projectTitle: 'Inspiration feed',
    projectDescription: 'Showcase new and relevant home renovation gallery images.',
    catalogItemNames: [],
    candidates,
    maxPicks,
  });

  const fallback = galleryImages.slice(0, maxPicks).map((img, idx) => ({
    galleryImageId: img.id,
    rank: idx + 1,
    keywords: normalizeKeywords([
      img.styleTag ?? '',
      img.catalogItem?.slug ?? '',
      img.catalogItem?.name ?? '',
    ]),
    aiReason: null as string | null,
  }));

  const picks = aiPicks.length > 0 ? aiPicks : fallback;

  await prisma.$transaction(async (tx) => {
    await (tx as any).userGalleryPick?.deleteMany?.({ where: { userId } });
    await (tx as any).userGalleryPick?.createMany?.({
      data: picks.map((p) => ({
        userId,
        galleryImageId: p.galleryImageId,
        rank: p.rank,
        keywords: p.keywords,
        aiReason: p.aiReason,
      })),
    });
  });

  return picks.map((p) => ({
    userId,
    galleryImageId: p.galleryImageId,
    rank: p.rank,
    keywords: p.keywords,
    aiReason: p.aiReason,
  }));
}

/** Placeholder gallery when DB has no GalleryImage rows and AI seed didn't run or failed. */
const LANDING_FALLBACK_GALLERY: GalleryImageForProject[] = [
  {
    id: 'fallback-1',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    title: 'Modern Double Door Entry',
    caption: null,
    styleTag: 'exterior',
    catalogItemName: 'Front Door',
    catalogItemSlug: 'front-door',
  },
  {
    id: 'fallback-2',
    imageUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
    title: 'Kitchen Reface + Stone Tops',
    caption: null,
    styleTag: 'kitchen',
    catalogItemName: 'Cabinet Refacing',
    catalogItemSlug: 'cabinet-refacing',
  },
  {
    id: 'fallback-3',
    imageUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80',
    title: 'Luxury Bath Refresh',
    caption: null,
    styleTag: 'bathroom',
    catalogItemName: 'Bidets',
    catalogItemSlug: 'bidets',
  },
];

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

/** Ask AI for Unsplash search queries for home renovation gallery. */
async function getSearchQueriesFromAI(): Promise<string[]> {
  const client = getAzureOpenAI();
  if (!client || !isAzureOpenAIConfigured()) return [];

  try {
    const completion = await client.chat.completions.create({
      model: '',
      messages: [
        {
          role: 'system',
          content:
            'You suggest Unsplash photo search queries for a home renovation inspiration gallery. Output ONLY valid JSON: { "queries": ["query1", "query2", ...] }. Use 6 short queries (2-4 words each) for: front door/entry, kitchen, bathroom, staircase/railings, vent/register, countertop. Examples: "modern front door", "kitchen cabinet refacing", "luxury bathroom". No other text.',
        },
        {
          role: 'user',
          content: 'Give 6 Unsplash search queries for home facelift gallery.',
        },
      ],
      max_tokens: 200,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() ?? '';
    const parsed = JSON.parse(raw) as { queries?: unknown };
    const queries = Array.isArray(parsed?.queries)
      ? (parsed.queries as string[]).filter((q) => typeof q === 'string' && q.trim().length > 0)
      : [];
    return queries.slice(0, 6);
  } catch {
    return [];
  }
}

/** Fetch photo URLs from Unsplash Search API. */
async function fetchPhotosFromUnsplash(
  query: string,
  count: number
): Promise<Array<{ url: string; title: string | null }>> {
  if (!UNSPLASH_ACCESS_KEY) return [];

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${Math.min(count, 5)}&client_id=${UNSPLASH_ACCESS_KEY}`
    );
    if (!res.ok) return [];

    const data = (await res.json()) as { results?: Array<{ urls?: { regular?: string }; description?: string | null; alt_description?: string | null }> };
    const results = data.results ?? [];
    return results.slice(0, count).map((r) => ({
      url: r.urls?.regular ?? '',
      title: (r.description || r.alt_description || query)?.slice(0, 200) ?? null,
    }));
  } catch {
    return [];
  }
}

/**
 * When gallery table is empty: use AI to get Unsplash search queries, fetch photos, and seed GalleryImage.
 * Requires UNSPLASH_ACCESS_KEY and (optionally) Azure OpenAI for query suggestions.
 * Returns number of images created.
 */
export async function seedGalleryFromAI(): Promise<number> {
  const existing = await prisma.galleryImage.count();
  if (existing > 0) return 0;

  const aiQueries = await getSearchQueriesFromAI();
  const queries: string[] =
    aiQueries.length > 0
      ? aiQueries
      : [
          'modern front door exterior',
          'kitchen cabinet refacing',
          'luxury bathroom renovation',
          'staircase railings modern',
          'floor vent cover',
          'kitchen countertop stone',
        ];

  const catalogBySlug = new Map<string, string>();
  try {
    const items = await prisma.catalogItem.findMany({
      where: { active: true },
      select: { id: true, slug: true },
    });
    items.forEach((i) => catalogBySlug.set(i.slug, i.id));
  } catch {
    // ignore
  }

  const slugFromQuery = (q: string): string | null => {
    const lower = q.toLowerCase();
    if (lower.includes('door') || lower.includes('entry')) return 'front-door';
    if (lower.includes('kitchen') && lower.includes('cabinet')) return 'cabinet-refacing';
    if (lower.includes('bath') || lower.includes('bathroom')) return 'bidets';
    if (lower.includes('stair') || lower.includes('railing')) return 'spindles-and-railings';
    if (lower.includes('vent') || lower.includes('register')) return 'air-vents';
    if (lower.includes('counter')) return 'countertops';
    return null;
  };

  let created = 0;
  for (const query of queries) {
    const photos = await fetchPhotosFromUnsplash(query, 2);
    for (const photo of photos) {
      if (!photo.url) continue;
      const slug = slugFromQuery(query);
      const catalogItemId = slug ? catalogBySlug.get(slug) ?? null : null;
      try {
        await prisma.galleryImage.create({
          data: {
            imageUrl: photo.url,
            title: photo.title,
            styleTag: query.split(/\s+/)[0] ?? null,
            catalogItemId,
            isPublic: true,
          },
        });
        created++;
      } catch {
        // skip duplicate or invalid
      }
    }
  }

  return created;
}

/**
 * Landing-page gallery: AI-ranked (or fallback) public gallery images.
 * When the DB has no GalleryImage rows, tries to seed via AI + Unsplash, then returns DB images or placeholders.
 */
export async function getLandingGallery(limit = 6): Promise<GalleryImageForProject[]> {
  let galleryImages = await prisma.galleryImage.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' },
    include: { catalogItem: true },
    take: 60,
  });

  if (galleryImages.length === 0) {
    try {
      await seedGalleryFromAI();
      galleryImages = await prisma.galleryImage.findMany({
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        include: { catalogItem: true },
        take: 60,
      });
    } catch {
      // seed failed (e.g. no Unsplash key), use fallback below
    }
  }

  if (galleryImages.length === 0) return LANDING_FALLBACK_GALLERY.slice(0, limit);

  const candidates = galleryImages.map((img) => ({
    id: img.id,
    title: img.title,
    caption: img.caption,
    styleTag: img.styleTag,
    catalogItemName: img.catalogItem?.name ?? null,
  }));

  const maxPicks = Math.min(limit, 12);

  const aiPicks = await pickAndKeywordGalleryWithAI({
    projectTitle: 'Landing inspiration',
    projectDescription: 'Show a balanced set of popular home facelift gallery images.',
    catalogItemNames: [],
    candidates,
    maxPicks,
  });

  const chosenIds = new Set(aiPicks.map((p) => p.galleryImageId));
  const ordered =
    aiPicks.length > 0
      ? galleryImages.filter((img) => chosenIds.has(img.id))
      : galleryImages.slice(0, maxPicks);

  return ordered.slice(0, maxPicks).map((img) => ({
    id: img.id,
    imageUrl: img.imageUrl,
    title: img.title,
    caption: img.caption,
    styleTag: img.styleTag,
    catalogItemName: img.catalogItem?.name ?? null,
    catalogItemSlug: img.catalogItem?.slug ?? null,
  }));
}
