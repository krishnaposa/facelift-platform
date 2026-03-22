'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CatalogLinesEditor from '@/app/components/projects/CatalogLinesEditor';
import NoteAssistantButton from '@/app/components/project/NoteAssistantButton';
import { lineToCatalogPayload } from '@/lib/edit-project-line-helpers';
import type { AddableCatalogEntry, EditFormLine } from '@/lib/edit-project-types';

export default function EditProjectForm({
  projectId,
  initialTitle,
  initialZipCode,
  initialNotes,
  initialNotesForContractors,
  initialPhotos,
  lines: initialLines,
  addableCatalog,
}: {
  projectId: string;
  initialTitle: string;
  initialZipCode: string;
  initialNotes: string;
  initialNotesForContractors: string;
  initialPhotos: string[];
  lines: EditFormLine[];
  addableCatalog: AddableCatalogEntry[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [zipCode, setZipCode] = useState(initialZipCode);
  const [notes, setNotes] = useState(initialNotes);
  const [notesForContractors, setNotesForContractors] = useState(initialNotesForContractors);
  const [photos, setPhotos] = useState(initialPhotos);
  const [lines, setLines] = useState<EditFormLine[]>(initialLines);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updatePhoto(index: number, value: string) {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addPhotoField() {
    setPhotos((prev) => [...prev, '']);
  }

  function removePhotoField(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (lines.length === 0) {
      setError('Select at least one upgrade item.');
      setSaving(false);
      return;
    }

    try {
      const cleanedPhotos = photos.map((p) => p.trim()).filter(Boolean);

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          zipCode: zipCode.trim(),
          notes: notes.trim(),
          notesForContractors: notesForContractors.trim(),
          photos: cleanedPhotos,
          catalogItems: lines.map(lineToCatalogPayload),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update project.');
      }

      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Edit Project
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        Update project details
      </h1>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Project Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Zip Code
          </label>
          <input
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Notes
          </label>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Note for contractors
          </label>
          <p className="mb-4 text-sm text-slate-600">
            Shown to contractors on your open project. Use this for access, scheduling, and constraints — not
            duplicated in your description above.
          </p>
          <textarea
            rows={4}
            value={notesForContractors}
            onChange={(e) => setNotesForContractors(e.target.value)}
            placeholder="e.g. gate code, parking, pets, quiet hours…"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
          />
          <div className="mt-4">
            <NoteAssistantButton
              projectId={projectId}
              role="homeowner"
              draftValue={notesForContractors}
              onApply={setNotesForContractors}
              label="Suggest note (assistant)"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-700">
            Requested upgrades
          </div>
          <p className="mb-4 text-sm text-slate-600">
            Same catalog as the project view. Adjust options, quantities, add or remove lines.
          </p>

          <CatalogLinesEditor
            lines={lines}
            onChange={setLines}
            addableCatalog={addableCatalog}
          />
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-700">
            Photo Links
          </div>

          <div className="space-y-3">
            {photos.map((photo, index) => (
              <div key={index} className="flex gap-3">
                <input
                  value={photo}
                  onChange={(e) => updatePhoto(index, e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="https://..."
                />
                {photos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhotoField(index)}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addPhotoField}
            className="mt-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
          >
            Add another photo link
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}`)}
            disabled={saving}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
