'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SafeImage from '@/app/components/ui/SafeImage';
import {
  defaultSelectedOptionsFromSchema,
  schemaUsesCountField,
  type CatalogSelectionRow,
} from '@/lib/catalog-selection';
import type { AddableCatalogEntry, EditFormLine } from '@/lib/edit-project-types';

function prettyKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function addLineFromCatalog(cat: AddableCatalogEntry): EditFormLine {
  const defaults = defaultSelectedOptionsFromSchema(cat.optionsSchema);
  const options: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(defaults)) {
    if (typeof v === 'number' || typeof v === 'string') {
      options[k] = v as string | number;
    }
  }
  let quantity = 1;
  if (schemaUsesCountField(cat.optionsSchema) && typeof options.count === 'number') {
    quantity = options.count;
  }
  return {
    key: crypto.randomUUID(),
    catalogItemId: cat.id,
    quantity,
    options,
    catalogItem: {
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      unitLabel: cat.unitLabel,
      categoryName: cat.categoryName,
      thumbnailUrl: cat.thumbnailUrl,
      optionsSchema: cat.optionsSchema,
    },
  };
}

function lineToCatalogPayload(line: EditFormLine): CatalogSelectionRow {
  const schema = line.catalogItem.optionsSchema;
  const opts = { ...line.options };
  let quantity = Math.max(1, Math.floor(line.quantity));

  if (schemaUsesCountField(schema)) {
    const c = typeof opts.count === 'number' ? opts.count : line.quantity;
    quantity = Math.max(1, Math.floor(c));
    const clean = { ...opts };
    delete clean.count;
    return {
      catalogItemId: line.catalogItemId,
      quantity,
      selectedOptions: clean,
    };
  }

  return {
    catalogItemId: line.catalogItemId,
    quantity,
    selectedOptions: opts,
  };
}

export default function EditProjectForm({
  projectId,
  initialTitle,
  initialZipCode,
  initialNotes,
  initialPhotos,
  lines: initialLines,
  addableCatalog,
}: {
  projectId: string;
  initialTitle: string;
  initialZipCode: string;
  initialNotes: string;
  initialPhotos: string[];
  lines: EditFormLine[];
  addableCatalog: AddableCatalogEntry[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [zipCode, setZipCode] = useState(initialZipCode);
  const [notes, setNotes] = useState(initialNotes);
  const [photos, setPhotos] = useState(initialPhotos);
  const [lines, setLines] = useState<EditFormLine[]>(initialLines);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addCatalogId, setAddCatalogId] = useState('');

  const selectedIds = useMemo(() => new Set(lines.map((l) => l.catalogItemId)), [lines]);
  const canAddMore = useMemo(
    () => addableCatalog.some((c) => !selectedIds.has(c.id)),
    [addableCatalog, selectedIds]
  );

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

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function patchLine(key: string, updater: (line: EditFormLine) => EditFormLine) {
    setLines((prev) => prev.map((l) => (l.key === key ? updater(l) : l)));
  }

  function handleAddSelected() {
    if (!addCatalogId) return;
    const cat = addableCatalog.find((c) => c.id === addCatalogId);
    if (!cat || selectedIds.has(cat.id)) return;
    setLines((prev) => [...prev, addLineFromCatalog(cat)]);
    setAddCatalogId('');
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
          <div className="mb-2 text-sm font-semibold text-slate-700">
            Requested upgrades
          </div>
          <p className="mb-4 text-sm text-slate-600">
            Same catalog as the project view. Adjust options, quantities, add or remove lines.
          </p>

          <div className="space-y-8">
            {lines.map((line) => {
              const schema = line.catalogItem.optionsSchema;
              const sel = line;

              return (
                <div
                  key={line.key}
                  className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-200 sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-2xl bg-slate-200 sm:h-24 sm:w-36">
                      <SafeImage
                        src={line.catalogItem.thumbnailUrl}
                        alt={line.catalogItem.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {line.catalogItem.categoryName}
                      </div>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {line.catalogItem.name}
                      </h3>
                      {line.catalogItem.description ? (
                        <p className="mt-2 text-sm text-slate-600">{line.catalogItem.description}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="shrink-0 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {schema && typeof schema === 'object'
                      ? Object.entries(schema as Record<string, unknown>).map(([key, val]) => {
                          if (Array.isArray(val)) {
                            const v = String(sel.options[key] ?? val[0] ?? '');
                            return (
                              <div key={key}>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                  {prettyKey(key)}
                                </label>
                                <select
                                  value={v}
                                  onChange={(e) =>
                                    patchLine(line.key, (l) => ({
                                      ...l,
                                      options: { ...l.options, [key]: e.target.value },
                                    }))
                                  }
                                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                                >
                                  {val.map((opt) => (
                                    <option key={String(opt)} value={String(opt)}>
                                      {String(opt).replace(/_/g, ' ')}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          }
                          if (val === 'number') {
                            const n =
                              typeof sel.options[key] === 'number' ? sel.options[key] : 1;
                            return (
                              <div key={key}>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                  {prettyKey(key)}
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={n}
                                  onChange={(e) => {
                                    const num = Math.max(1, parseInt(e.target.value, 10) || 1);
                                    patchLine(line.key, (l) => ({
                                      ...l,
                                      options: { ...l.options, [key]: num },
                                      quantity: key === 'count' ? num : l.quantity,
                                    }));
                                  }}
                                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                                />
                              </div>
                            );
                          }
                          return null;
                        })
                      : null}

                    {!schemaUsesCountField(schema) ? (
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Quantity (units)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={sel.quantity}
                          onChange={(e) => {
                            const num = Math.max(1, parseInt(e.target.value, 10) || 1);
                            patchLine(line.key, (l) => ({ ...l, quantity: num }));
                          }}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                        />
                        {line.catalogItem.unitLabel ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Unit: {line.catalogItem.unitLabel}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {canAddMore ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Add upgrade from catalog
                </label>
                <select
                  value={addCatalogId}
                  onChange={(e) => setAddCatalogId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                >
                  <option value="">Choose an item…</option>
                  {addableCatalog
                    .filter((c) => !selectedIds.has(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.categoryName} — {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddSelected}
                disabled={!addCatalogId}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          ) : null}
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
