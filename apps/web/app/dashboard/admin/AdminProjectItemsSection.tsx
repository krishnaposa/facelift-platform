'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CatalogLinesEditor from '@/app/components/projects/CatalogLinesEditor';
import { lineToCatalogPayload } from '@/lib/edit-project-line-helpers';
import type { AddableCatalogEntry, EditFormLine } from '@/lib/edit-project-types';

type Props = {
  projectId: string;
  initialLines: EditFormLine[];
  addableCatalog: AddableCatalogEntry[];
};

export default function AdminProjectItemsSection({
  projectId,
  initialLines,
  addableCatalog,
}: Props) {
  const router = useRouter();
  const [lines, setLines] = useState<EditFormLine[]>(initialLines);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setOk(false);

    if (lines.length === 0) {
      setError('Add at least one catalog line item.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogItems: lines.map(lineToCatalogPayload),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Save failed');
      }
      setOk(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <p className="text-sm text-amber-900 ring-1 ring-amber-200 bg-amber-50/90 rounded-2xl px-4 py-3">
        <span className="font-semibold">Bids and messages: </span>
        Replacing line items deletes existing project-item rows. Existing bid line items that pointed at
        removed lines are removed by the database, and bid totals may no longer match. Use when
        coordinating a data fix with the homeowner or contractor.
      </p>

      <CatalogLinesEditor
        lines={lines}
        onChange={setLines}
        addableCatalog={addableCatalog}
        notesLabel="Notes for contractors (this line only)"
      />

      {error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      ) : null}
      {ok ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Line items saved.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save line items'}
      </button>
    </form>
  );
}
