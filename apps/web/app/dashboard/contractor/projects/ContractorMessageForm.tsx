'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  projectId: string;
  /** Omit or null = whole-project question */
  projectItemId?: string | null;
  contextLabel: string;
  canInteract?: boolean;
  lockedReason?: string;
};

export default function ContractorMessageForm({
  projectId,
  projectItemId = null,
  contextLabel,
  canInteract = true,
  lockedReason,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/projects/${projectId}/contractor/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          projectItemId: projectItemId || undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Could not send message.');
      }

      setBody('');
      setSent(true);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!canInteract) {
    return lockedReason ? (
      <p className="mt-2 text-xs text-slate-500">{lockedReason}</p>
    ) : null;
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setOpen(true);
          }}
          className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
        >
          Message homeowner{contextLabel ? ` (${contextLabel})` : ''}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 ring-1 ring-slate-100">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            required
            minLength={3}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            placeholder="Ask for clarification or more detail…"
          />
          {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {sent ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">Message sent. The homeowner will see it on their project.</p>
      ) : null}
    </div>
  );
}
