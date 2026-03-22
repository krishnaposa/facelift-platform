import { getAzureOpenAI, isAzureOpenAIConfigured } from '@/lib/azure-openai';

export type NoteAssistantRole = 'homeowner' | 'contractor';

/** Contractor: questions to homeowner vs optional bid cover letter */
export type ContractorNoteIntent = 'clarify' | 'cover_letter';

export type NoteAssistantContext = {
  role: NoteAssistantRole;
  projectTitle: string;
  projectDescription: string | null;
  zipCode: string;
  /** Catalog names for selected upgrades */
  upgradeNames: string[];
  /** When contractor messages about one line */
  projectItemName?: string | null;
  /** Optional rough bullets or keywords the user typed */
  draft?: string | null;
  /** Only for role contractor */
  contractorIntent?: ContractorNoteIntent;
};

function fallbackHomeownerNote(ctx: NoteAssistantContext): string {
  const lines: string[] = [
    `- Project: ${ctx.projectTitle} (${ctx.zipCode}).`,
    ctx.upgradeNames.length
      ? `- Scope includes: ${ctx.upgradeNames.join(', ')}.`
      : '- Scope: see requested upgrades on the project.',
    '- Access: [e.g. driveway, gate code, where to park] — please confirm before the site visit.',
    '- Preferred contact: [hours, phone/text] for scheduling.',
    '- Timeline: [target start / must be done by] or flexible.',
    '- Home details: [pets, kids, work-from-home, noise-sensitive hours].',
    '- Materials & finishes: [brand preferences, color direction, or “open to contractor guidance”].',
    '- Photos or measurements: [what you can provide before bid] if anything is missing from the listing.',
  ];
  if (ctx.projectDescription?.trim()) {
    lines.splice(
      2,
      0,
      `- Context from my description: ${ctx.projectDescription.trim().slice(0, 400)}${ctx.projectDescription.length > 400 ? '…' : ''}`
    );
  }
  if (ctx.draft?.trim()) {
    lines.push(`- I also want to mention: ${ctx.draft.trim().slice(0, 500)}`);
  }
  return lines.join('\n');
}

function fallbackContractorCoverLetter(ctx: NoteAssistantContext): string {
  const scope = ctx.upgradeNames.length
    ? `We’re bidding on: ${ctx.upgradeNames.join(', ')}.`
    : 'We’re aligned with the scope listed on your project.';
  const parts = [
    `Thank you for considering our proposal for ${ctx.projectTitle} in ${ctx.zipCode}.`,
    scope,
    '',
    'Highlights:',
    '- Timeline: [calendar days to complete] from a mutually agreed start, subject to material lead times.',
    '- What’s included: [labor, materials, permits, haul-away — be specific].',
    '- Next step: we’re happy to walk the site or clarify any line item before you decide.',
  ];
  if (ctx.projectDescription?.trim()) {
    parts.splice(
      3,
      0,
      `We reviewed your description and will align our work with your priorities.`
    );
  }
  if (ctx.draft?.trim()) {
    parts.push('', ctx.draft.trim().slice(0, 800));
  }
  return parts.join('\n');
}

function fallbackContractorMessage(ctx: NoteAssistantContext): string {
  const scope = ctx.projectItemName
    ? `the line item “${ctx.projectItemName}”`
    : 'this project overall';
  const parts = [
    `Hi — thanks for posting ${ctx.projectTitle}. I’m reviewing ${scope} in ${ctx.zipCode}.`,
    ctx.upgradeNames.length
      ? `I see your requested upgrades include: ${ctx.upgradeNames.slice(0, 6).join(', ')}${ctx.upgradeNames.length > 6 ? '…' : ''}.`
      : ''
  ].filter(Boolean);

  if (ctx.projectDescription?.trim()) {
    parts.push(
      `I read your description and want to confirm a few details before I finalize my bid.`
    );
  }

  parts.push(
    '',
    'Questions:',
    '- Site visit: [preferred date range / window] — does that work on your end?',
    '- Existing conditions: [what you’d like me to verify — e.g. substrate, electrical, plumbing, clearances].',
    '- Inclusions: [what you expect included vs. optional] so we can align on scope.',
    '- Decision timeline: [when you plan to review bids / award].',
    ''
  );

  if (ctx.draft?.trim()) {
    parts.push(`Also: ${ctx.draft.trim().slice(0, 500)}`);
  } else {
    parts.push(
      'Happy to adjust scope once I hear back — I’ll keep my bid clear and itemized.'
    );
  }

  return parts.join('\n\n');
}

export function suggestNoteFallback(ctx: NoteAssistantContext): string {
  if (ctx.role === 'homeowner') return fallbackHomeownerNote(ctx);
  if (ctx.contractorIntent === 'cover_letter') return fallbackContractorCoverLetter(ctx);
  return fallbackContractorMessage(ctx);
}

export async function suggestNoteWithAi(ctx: NoteAssistantContext): Promise<string | null> {
  const client = getAzureOpenAI();
  if (!client || !isAzureOpenAIConfigured()) return null;

  const system =
    ctx.role === 'homeowner'
      ? 'You help homeowners write a short, practical “note for contractors” for a renovation project. Cover access, scheduling preferences, timeline, constraints (pets, noise), and what you still need from bidders — without being legal advice. Use plain English, bullet points or short paragraphs. No greeting fluff. Output only the note text.'
      : ctx.contractorIntent === 'cover_letter'
        ? 'You help contractors write a short optional bid cover letter for a renovation job: professional tone, timeline intent, what is included at a high level (no dollar amounts unless the user draft mentions them). No legal guarantees. Output only the letter text.'
        : 'You help contractors write a concise message to a homeowner asking for missing details before bidding. Be professional and specific. Ask grouped questions (site visit, scope clarifications, timeline). Output only the message body.';

  const userPayload = JSON.stringify({
    role: ctx.role,
    contractorIntent: ctx.role === 'contractor' ? (ctx.contractorIntent ?? 'clarify') : null,
    projectTitle: ctx.projectTitle,
    zipCode: ctx.zipCode,
    description: ctx.projectDescription?.slice(0, 2000) ?? null,
    upgradeNames: ctx.upgradeNames,
    projectItemName: ctx.projectItemName ?? null,
    roughDraft: ctx.draft?.slice(0, 2000) ?? null,
  });

  try {
    const completion = await client.chat.completions.create({
      model: '',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPayload.slice(0, 12000) },
      ],
      max_tokens: 600,
      temperature: 0.35,
    });

    const text = completion.choices?.[0]?.message?.content?.trim() ?? '';
    if (!text) return null;
    return text.slice(0, 8000);
  } catch {
    return null;
  }
}

export async function suggestNote(ctx: NoteAssistantContext): Promise<string> {
  const ai = await suggestNoteWithAi(ctx);
  if (ai) return ai;
  return suggestNoteFallback(ctx);
}
