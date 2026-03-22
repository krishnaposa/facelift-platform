'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import NoteAssistantButton from '@/app/components/project/NoteAssistantButton';

type Props = {
  projectId: string;
  initialText: string;
};

export default function ContractorFacingNoteEditor({ projectId, initialText }: Props) {
  const router = useRouter();
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch(`/api/projects/${projectId}/contractor-notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesForContractors: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Could not save.');
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
    >
      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Note for contractors
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Share access, timing, and constraints—so contractors can bid without guessing. This is shown on
        your open project when contractors review it.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={5}
        placeholder="e.g. driveway access, gate code, preferred visit windows, pets, noise-sensitive hours, materials you already have…"
        className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-relaxed outline-none focus:border-slate-900"
      />
      <div className="mt-3">
        <NoteAssistantButton
          projectId={projectId}
          role="homeowner"
          draftValue={text}
          onApply={(s) => {
            setText(s);
            setSaved(false);
          }}
          label="Suggest note (assistant)"
        />
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
      {saved ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">Saved.</p>
      ) : null}
      <div className="mt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save note'}
        </button>
      </div>
    </form>
  );
}
