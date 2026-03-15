'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type UpgradeKey =
  | 'frontDoor'
  | 'bidets'
  | 'cabinetRefacing'
  | 'spindles'
  | 'airVents'
  | 'countertops';

type FormState = {
  title: string;
  zipCode: string;
  notes: string;
  photos: string[];
  items: {
    frontDoor?: {
      selected: boolean;
      type?: 'single' | 'double' | 'double_sidelights';
    };
    bidets?: {
      selected: boolean;
      count?: number;
    };
    cabinetRefacing?: {
      selected: boolean;
      finish?: 'painted' | 'stained' | 'laminate';
    };
    spindles?: {
      selected: boolean;
      material?: 'wood' | 'iron' | 'steel';
    };
    airVents?: {
      selected: boolean;
      style?: 'modern_white' | 'black_metal' | 'wood_flush';
    };
    countertops?: {
      selected: boolean;
      material?: 'quartz' | 'granite' | 'marble' | 'laminate';
    };
  };
};

export default function EditProjectForm({
  projectId,
  initialForm,
}: {
  projectId: string;
  initialForm: FormState;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleItem(key: UpgradeKey) {
    setForm((prev) => {
      const existing = prev.items[key];
      const nextSelected = !existing?.selected;

      return {
        ...prev,
        items: {
          ...prev.items,
          [key]: {
            ...existing,
            selected: nextSelected,
          },
        },
      };
    });
  }

  function updatePhoto(index: number, value: string) {
    setForm((prev) => {
      const nextPhotos = [...prev.photos];
      nextPhotos[index] = value;
      return { ...prev, photos: nextPhotos };
    });
  }

  function addPhotoField() {
    setForm((prev) => ({
      ...prev,
      photos: [...prev.photos, ''],
    }));
  }

  function removePhotoField(index: number) {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const cleanedPhotos = form.photos.map((p) => p.trim()).filter(Boolean);

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title.trim(),
          zipCode: form.zipCode.trim(),
          selections: {
            ...form,
            photos: cleanedPhotos,
          },
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
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Zip Code
          </label>
          <input
            value={form.zipCode}
            onChange={(e) => setForm((prev) => ({ ...prev, zipCode: e.target.value }))}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Notes
          </label>
          <textarea
            rows={5}
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-700">
            Requested Items
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { key: 'frontDoor', label: 'Front Door' },
              { key: 'bidets', label: 'Bidets' },
              { key: 'cabinetRefacing', label: 'Cabinet Refacing' },
              { key: 'spindles', label: 'Spindles and Railings' },
              { key: 'airVents', label: 'Air Vents' },
              { key: 'countertops', label: 'Countertops' },
            ].map((item) => {
              const key = item.key as UpgradeKey;
              const selected = !!form.items[key]?.selected;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleItem(key)}
                  className={`rounded-[24px] p-5 text-left ${
                    selected
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-900 ring-1 ring-slate-200'
                  }`}
                >
                  <div className="text-lg font-semibold">{item.label}</div>
                  <div className="mt-2 text-sm">
                    {selected ? 'Selected' : 'Not selected'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-700">
            Photo Links
          </div>

          <div className="space-y-3">
            {form.photos.map((photo, index) => (
              <div key={index} className="flex gap-3">
                <input
                  value={photo}
                  onChange={(e) => updatePhoto(index, e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="https://..."
                />
                {form.photos.length > 1 && (
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

        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}