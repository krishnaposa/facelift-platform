'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  projectId: string;
  catalogItemId: string;
};

export default function SuggestedAddButton({ projectId, catalogItemId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogItemId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Could not add upgrade.');
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="shrink-0 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? 'Adding…' : 'Add to project'}
      </button>
      {error ? <span className="max-w-[140px] text-right text-[10px] text-red-600">{error}</span> : null}
    </div>
  );
}
