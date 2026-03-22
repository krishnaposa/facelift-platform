'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SafeImage from '@/app/components/ui/SafeImage';
import { formatUsdWhole } from '@/lib/format-currency';
import type { WizardCatalogItem } from '@/lib/catalog-wizard';

type Props = {
  catalog: WizardCatalogItem[];
};

type SelectionState = {
  quantity: number;
  options: Record<string, string | number>;
  lineNotes: string;
};

function defaultOptionsFromSchema(schema: unknown): Record<string, string | number> {
  if (!schema || typeof schema !== 'object') return {};
  const out: Record<string, string | number> = {};
  for (const [key, val] of Object.entries(schema as Record<string, unknown>)) {
    if (Array.isArray(val) && val.length > 0) out[key] = String(val[0]);
    else if (val === 'number') out[key] = 1;
  }
  return out;
}

function prettyKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NewProjectWizard({ catalog }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [title, setTitle] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>(['']);

  /** catalogItemId -> selection */
  const [selections, setSelections] = useState<Record<string, SelectionState>>({});

  const catalogById = useMemo(
    () => new Map(catalog.map((c) => [c.id, c])),
    [catalog]
  );

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of catalog) {
      map.set(c.categorySlug, c.categoryName);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((item) => {
      if (categoryFilter !== 'all' && item.categorySlug !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q)
      );
    });
  }, [catalog, categoryFilter, search]);

  const selectedIds = useMemo(() => Object.keys(selections), [selections]);
  const selectedCount = selectedIds.length;

  const estimateSummary = useMemo(() => {
    let sum = 0;
    let parts = 0;
    for (const id of selectedIds) {
      const item = catalogById.get(id);
      if (!item?.avgInstallCost.hasData || item.avgInstallCost.average == null) continue;
      const qty = resolveQuantity(item, selections[id]!);
      sum += item.avgInstallCost.average * qty;
      parts += 1;
    }
    return { sum, parts, hasTotal: parts > 0 };
  }, [selectedIds, catalogById, selections]);

  function toggleItem(item: WizardCatalogItem) {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = {
          quantity: 1,
          options: defaultOptionsFromSchema(item.optionsSchema),
          lineNotes: '',
        };
      }
      return next;
    });
  }

  function updateSelection(id: string, patch: Partial<SelectionState>) {
    setSelections((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const nextOptions =
        patch.options !== undefined
          ? { ...cur.options, ...patch.options }
          : cur.options;
      return {
        ...prev,
        [id]: {
          ...cur,
          ...patch,
          options: nextOptions,
        },
      };
    });
  }

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

  function validateStep(current: number) {
    if (current === 1 && selectedCount === 0) {
      setError('Select at least one upgrade.');
      return false;
    }
    if (current === 3) {
      if (!title.trim()) {
        setError('Enter a project title.');
        return false;
      }
      if (!zipCode.trim()) {
        setError('Enter a zip code.');
        return false;
      }
    }
    setError('');
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, 4));
  }

  function prevStep() {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    if (!validateStep(3)) return;
    try {
      setSubmitting(true);
      setError('');

      const catalogItems = selectedIds.map((id) => {
        const item = catalogById.get(id)!;
        const sel = selections[id]!;
        const qty = resolveQuantity(item, sel);
        const opts = { ...sel.options };
        if (typeof opts.count === 'number') {
          delete opts.count;
        }
        const lineNotesTrim = (sel.lineNotes ?? '').trim();
        const rowNotes = lineNotesTrim ? lineNotesTrim.slice(0, 2000) : undefined;
        return {
          catalogItemId: id,
          quantity: qty,
          selectedOptions: Object.keys(opts).length > 0 ? opts : undefined,
          ...(rowNotes ? { notes: rowNotes } : {}),
        };
      });

      const cleanedPhotos = photos.map((p) => p.trim()).filter(Boolean);

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          zipCode: zipCode.trim(),
          notes: notes.trim(),
          photos: cleanedPhotos,
          catalogItems,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create project.');
      }

      const data = await res.json();
      if (!data?.project?.id) {
        throw new Error('Project created, but no project id was returned.');
      }

      router.push(`/projects/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (catalog.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-semibold text-slate-900">Catalog unavailable</h1>
          <p className="mt-2 text-slate-600">
            We couldn&apos;t load upgrade options. Check your database and run migrations + seed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Homeowner project wizard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Build your facelift project
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Browse every upgrade with photos and typical installation costs from past contractor
            bids (when available). Select what you want, set options, then submit for bids.
          </p>
        </header>

        <div className="mb-8 flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                step === n
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200'
              }`}
            >
              {n === 1 && 'Upgrades'}
              {n === 2 && 'Options'}
              {n === 3 && 'Details'}
              {n === 4 && 'Review'}
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            {step === 1 && (
              <StepPickUpgrades
                filteredCatalog={filteredCatalog}
                selections={selections}
                toggleItem={toggleItem}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                categories={categories}
                search={search}
                setSearch={setSearch}
                selectedCount={selectedCount}
              />
            )}
            {step === 2 && (
              <StepConfigureOptions
                selectedIds={selectedIds}
                catalogById={catalogById}
                selections={selections}
                updateSelection={updateSelection}
              />
            )}
            {step === 3 && (
              <StepProjectDetails
                title={title}
                setTitle={setTitle}
                zipCode={zipCode}
                setZipCode={setZipCode}
                notes={notes}
                setNotes={setNotes}
                photos={photos}
                updatePhoto={updatePhoto}
                addPhotoField={addPhotoField}
                removePhotoField={removePhotoField}
              />
            )}
            {step === 4 && (
              <StepReview
                selectedIds={selectedIds}
                catalogById={catalogById}
                selections={selections}
                title={title}
                zipCode={zipCode}
                notes={notes}
                photos={photos}
              />
            )}

            {error ? (
              <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1 || submitting}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={submitting}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit project'}
                </button>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-8 h-fit space-y-4">
            <div className="rounded-3xl bg-slate-900 p-6 text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Selection
              </div>
              <div className="mt-2 text-3xl font-bold">{selectedCount}</div>
              <div className="text-sm text-slate-300">upgrades selected</div>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Typical install (from bids)
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Averages use contractor line-item amounts on similar upgrades. Add more bids to
                improve accuracy.
              </p>
              {estimateSummary.hasTotal ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="text-2xl font-semibold text-slate-900">
                    {formatUsdWhole(estimateSummary.sum)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Sum of averages × quantity ({estimateSummary.parts} item
                    {estimateSummary.parts === 1 ? '' : 's'} with bid data)
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No bid history yet for your selection — contractors will price on your project.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function schemaUsesCountField(schema: unknown): boolean {
  return (
    !!schema &&
    typeof schema === 'object' &&
    (schema as Record<string, unknown>).count === 'number'
  );
}

function resolveQuantity(item: WizardCatalogItem, sel: SelectionState): number {
  const schema = item.optionsSchema;
  const hasCount = schemaUsesCountField(schema);
  if (hasCount && typeof sel.options.count === 'number' && sel.options.count > 0) {
    return Math.floor(sel.options.count);
  }
  if (sel.quantity > 0) return Math.floor(sel.quantity);
  return 1;
}

function StepPickUpgrades({
  filteredCatalog,
  selections,
  toggleItem,
  categoryFilter,
  setCategoryFilter,
  categories,
  search,
  setSearch,
  selectedCount,
}: {
  filteredCatalog: WizardCatalogItem[];
  selections: Record<string, SelectionState>;
  toggleItem: (item: WizardCatalogItem) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  categories: [string, string][];
  search: string;
  setSearch: (v: string) => void;
  selectedCount: number;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">Choose upgrades</h2>
      <p className="mt-2 text-slate-600">
        Tap a card to include it in your project. Each card shows a catalog inspiration photo.
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search upgrades…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 sm:max-w-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
        >
          <option value="all">All categories</option>
          {categories.map(([slug, name]) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {filteredCatalog.map((item) => {
          const selected = !!selections[item.id];
          const avg = item.avgInstallCost;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleItem(item)}
              className={`group overflow-hidden rounded-[24px] text-left ring-2 transition ${
                selected
                  ? 'ring-slate-900 shadow-lg'
                  : 'ring-slate-200 bg-white hover:ring-slate-400'
              }`}
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <SafeImage
                  src={item.thumbnailUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {item.categoryName}
                    </span>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.name}</h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      selected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {selected ? 'Added' : 'Add'}
                  </span>
                </div>
                {item.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {avg.hasData ? (
                    <>
                      <span className="rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">
                        Avg install {formatUsdWhole(avg.average)}
                      </span>
                      {avg.min != null && avg.max != null ? (
                        <span className="text-slate-500">
                          Range {formatUsdWhole(avg.min)} – {formatUsdWhole(avg.max)} ({avg.count}{' '}
                          line items)
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">
                      No bid data yet — you&apos;ll get real quotes
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filteredCatalog.length === 0 ? (
        <p className="mt-8 text-center text-slate-500">No upgrades match your filters.</p>
      ) : null}

      <p className="mt-8 text-sm font-medium text-slate-500">
        {selectedCount} upgrade{selectedCount === 1 ? '' : 's'} selected
      </p>
    </div>
  );
}

function StepConfigureOptions({
  selectedIds,
  catalogById,
  selections,
  updateSelection,
}: {
  selectedIds: string[];
  catalogById: Map<string, WizardCatalogItem>;
  selections: Record<string, SelectionState>;
  updateSelection: (id: string, patch: Partial<SelectionState>) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">Configure options</h2>
      <p className="mt-2 text-slate-600">
        Set preferences for each upgrade. Add notes so contractors know what you want—this also
        helps tailor inspiration and estimates.
      </p>

      <div className="mt-8 space-y-8">
        {selectedIds.map((id) => {
          const item = catalogById.get(id);
          if (!item) return null;
          const sel = selections[id]!;
          const schema = item.optionsSchema;

          return (
            <div
              key={id}
              className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-200 sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-2xl bg-slate-200 sm:h-24 sm:w-36">
                  <SafeImage
                    src={item.thumbnailUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                  {item.avgInstallCost.hasData && item.avgInstallCost.average != null ? (
                    <p className="mt-1 text-sm text-emerald-800">
                      Typical line-item from bids: {formatUsdWhole(item.avgInstallCost.average)} (×{' '}
                      {resolveQuantity(item, sel)} units ≈{' '}
                      {formatUsdWhole(item.avgInstallCost.average * resolveQuantity(item, sel))})
                    </p>
                  ) : null}
                </div>
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
                                updateSelection(id, {
                                  options: { ...sel.options, [key]: e.target.value },
                                })
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
                        const n = typeof sel.options[key] === 'number' ? sel.options[key] : 1;
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
                                updateSelection(id, {
                                  options: { ...sel.options, [key]: num },
                                  quantity: key === 'count' ? num : sel.quantity,
                                });
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
                        updateSelection(id, { quantity: num });
                      }}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                    />
                    {item.unitLabel ? (
                      <p className="mt-1 text-xs text-slate-500">Unit: {item.unitLabel}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

                  <div className="mt-6 sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Notes for contractors (this upgrade)
                    </label>
                    <textarea
                      rows={3}
                      value={sel.lineNotes ?? ''}
                      onChange={(e) =>
                        updateSelection(id, { lineNotes: e.target.value })
                      }
                      placeholder="Optional: finishes, access, what you’re trying to match, etc."
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

function StepProjectDetails({
  title,
  setTitle,
  zipCode,
  setZipCode,
  notes,
  setNotes,
  photos,
  updatePhoto,
  addPhotoField,
  removePhotoField,
}: {
  title: string;
  setTitle: (v: string) => void;
  zipCode: string;
  setZipCode: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  photos: string[];
  updatePhoto: (i: number, v: string) => void;
  addPhotoField: () => void;
  removePhotoField: (i: number) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">Project details</h2>
      <p className="mt-2 text-slate-600">Title, location, notes, and reference photo URLs.</p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Project title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="e.g. Main bath + kitchen refresh"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Zip code</label>
          <input
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="12345"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Overall project notes
          </label>
          <p className="mb-2 text-xs text-slate-500">
            Whole-project context (timing, budget, access). Per-upgrade details go in step 2.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="Timing, budget thoughts, access, etc."
          />
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold text-slate-700">Photo links</div>
          <div className="space-y-3">
            {photos.map((photo, index) => (
              <div key={index} className="flex gap-3">
                <input
                  value={photo}
                  onChange={(e) => updatePhoto(index, e.target.value)}
                  placeholder="https://…"
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
                {photos.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removePhotoField(index)}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addPhotoField}
            className="mt-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
          >
            Add photo link
          </button>
        </div>
      </div>
    </div>
  );
}

function StepReview({
  selectedIds,
  catalogById,
  selections,
  title,
  zipCode,
  notes,
  photos,
}: {
  selectedIds: string[];
  catalogById: Map<string, WizardCatalogItem>;
  selections: Record<string, SelectionState>;
  title: string;
  zipCode: string;
  notes: string;
  photos: string[];
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">Review</h2>
      <p className="mt-2 text-slate-600">Confirm upgrades and project info before submitting.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Upgrades
          </div>
          <ul className="mt-4 space-y-4">
            {selectedIds.map((id) => {
              const item = catalogById.get(id);
              if (!item) return null;
              const sel = selections[id]!;
              const qty = resolveQuantity(item, sel);
              return (
                <li key={id} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                  <SafeImage
                    src={item.thumbnailUrl}
                    alt={item.name}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">
                      Qty {qty}
                      {item.avgInstallCost.hasData && item.avgInstallCost.average != null
                        ? ` · ~${formatUsdWhole(item.avgInstallCost.average * qty)} at avg line rate`
                        : ''}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {Object.entries(sel.options)
                        .filter(([k]) => k !== 'count')
                        .map(([k, v]) => (
                          <span key={k} className="mr-2 inline-block">
                            {prettyKey(k)}: {String(v)}
                          </span>
                        ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Project
          </div>
          <dl className="mt-4 space-y-2 text-sm text-slate-700">
            <div>
              <dt className="font-semibold text-slate-900">Title</dt>
              <dd>{title || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Zip</dt>
              <dd>{zipCode || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Notes</dt>
              <dd className="whitespace-pre-wrap">{notes || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Photo links</dt>
              <dd>{photos.filter(Boolean).length}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
