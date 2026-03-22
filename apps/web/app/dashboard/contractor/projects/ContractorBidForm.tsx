'use client';

import NoteAssistantButton from '@/app/components/project/NoteAssistantButton';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export type BidLineSeed = {
  projectItemId: string;
  catalogName: string;
  amount: string;
  note: string;
};

type Props = {
  projectId: string;
  lines: BidLineSeed[];
  existingTotal?: number | null;
  existingDays?: number | null;
  existingMessage?: string | null;
  /** When false, bidding is blocked until the platform approves the contractor account. */
  canInteract?: boolean;
  lockedReason?: string;
};

export default function ContractorBidForm({
  projectId,
  lines,
  existingTotal,
  existingDays,
  existingMessage,
  canInteract = true,
  lockedReason,
}: Props) {
  const router = useRouter();
  const [daysToComplete, setDaysToComplete] = useState(
    existingDays != null ? String(existingDays) : ''
  );
  const [message, setMessage] = useState(existingMessage ?? '');
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const row of lines) {
      m[row.projectItemId] = row.amount;
    }
    return m;
  });
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const row of lines) {
      m[row.projectItemId] = row.note;
    }
    return m;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const computedTotal = useMemo(() => {
    let sum = 0;
    for (const row of lines) {
      const raw = amounts[row.projectItemId]?.trim() ?? '';
      const n = parseFloat(raw.replace(/,/g, ''));
      if (Number.isFinite(n) && n >= 0) sum += n;
    }
    return Math.round(sum * 100) / 100;
  }, [amounts, lines]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const days = parseInt(daysToComplete, 10);
    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      setError('Enter days to complete (1–3650).');
      setSubmitting(false);
      return;
    }

    const lineItems = lines.map((row) => ({
      projectItemId: row.projectItemId,
      amount: amounts[row.projectItemId]?.trim() === '' ? 0 : amounts[row.projectItemId],
      note: notes[row.projectItemId]?.trim() || undefined,
    }));

    try {
      const res = await fetch(`/api/projects/${projectId}/contractor/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daysToComplete: days,
          message: message.trim() || undefined,
          lineItems,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Could not save bid.');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!canInteract && lockedReason ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100">
          {lockedReason}
        </div>
      ) : null}
      <fieldset disabled={!canInteract} className="space-y-5 [&:disabled]:opacity-60">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Days to complete
          </label>
          <input
            type="number"
            min={1}
            max={3650}
            required
            value={daysToComplete}
            onChange={(e) => setDaysToComplete(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Bid total (sum of lines)
          </label>
          <div className="flex h-[50px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900">
            ${computedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {existingTotal != null && Math.abs(existingTotal - computedTotal) > 0.01 ? (
              <span className="ml-2 text-xs font-normal text-slate-500">
                (was ${existingTotal.toFixed(2)})
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Cover letter (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
          placeholder="Timeline, materials, what’s included…"
        />
        <div className="mt-2">
          <NoteAssistantButton
            projectId={projectId}
            role="contractor"
            contractorIntent="cover_letter"
            draftValue={message}
            onApply={setMessage}
            label="Suggest cover letter (assistant)"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-sm font-semibold text-slate-900">Price by line item</div>
        <p className="text-xs text-slate-500">
          Enter <span className="font-medium">0</span> for work you are not including. At least one line
          must be greater than $0.
        </p>
        <ul className="space-y-4">
          {lines.map((row) => (
            <li
              key={row.projectItemId}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className="text-sm font-semibold text-slate-900">{row.catalogName}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Your price ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amounts[row.projectItemId] ?? ''}
                    onChange={(e) =>
                      setAmounts((prev) => ({ ...prev, [row.projectItemId]: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Line note (optional)
                  </label>
                  <input
                    type="text"
                    value={notes[row.projectItemId] ?? ''}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [row.projectItemId]: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    placeholder="e.g. assumes existing subfloor OK"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || lines.length === 0 || !canInteract}
        className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Saving…' : existingTotal != null ? 'Update bid' : 'Submit bid'}
      </button>
      </fieldset>
    </form>
  );
}
