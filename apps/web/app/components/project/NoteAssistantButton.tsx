'use client';

import { useState } from 'react';

type Props = {
  projectId: string;
  role: 'homeowner' | 'contractor';
  projectItemId?: string | null;
  /** For role contractor: question vs bid cover letter */
  contractorIntent?: 'clarify' | 'cover_letter';
  /** Current textarea content — used as rough input for the model */
  draftValue: string;
  onApply: (text: string) => void;
  label?: string;
  className?: string;
};

export default function NoteAssistantButton({
  projectId,
  role,
  projectItemId = null,
  contractorIntent,
  draftValue,
  onApply,
  label = 'Suggest with assistant',
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/suggest-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          projectItemId: projectItemId || undefined,
          contractorIntent:
            role === 'contractor' ? contractorIntent ?? 'clarify' : undefined,
          draft: draftValue.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Could not suggest.');
      }
      if (typeof data?.suggested === 'string') {
        onApply(data.suggested);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? 'Working…' : label}
      </button>
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
    </div>
  );
}
