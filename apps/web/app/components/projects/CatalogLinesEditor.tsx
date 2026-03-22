'use client';

import { useMemo, useState } from 'react';
import SafeImage from '@/app/components/ui/SafeImage';
import { addLineFromCatalog, prettyKey } from '@/lib/edit-project-line-helpers';
import { schemaUsesCountField } from '@/lib/catalog-selection';
import type { AddableCatalogEntry, EditFormLine } from '@/lib/edit-project-types';

type Props = {
  lines: EditFormLine[];
  onChange: (lines: EditFormLine[]) => void;
  addableCatalog: AddableCatalogEntry[];
  /** When false, hide add/remove (read-only preview). */
  allowEdit?: boolean;
  notesLabel?: string;
  notesPlaceholder?: string;
};

export default function CatalogLinesEditor({
  lines,
  onChange,
  addableCatalog,
  allowEdit = true,
  notesLabel = 'Notes for contractors (this line only)',
  notesPlaceholder = 'Optional details visible to contractors for this upgrade',
}: Props) {
  const [addCatalogId, setAddCatalogId] = useState('');

  const selectedIds = useMemo(() => new Set(lines.map((l) => l.catalogItemId)), [lines]);
  const canAddMore = useMemo(
    () => allowEdit && addableCatalog.some((c) => !selectedIds.has(c.id)),
    [addableCatalog, selectedIds, allowEdit]
  );

  function removeLine(key: string) {
    onChange(lines.filter((l) => l.key !== key));
  }

  function patchLine(key: string, updater: (line: EditFormLine) => EditFormLine) {
    onChange(lines.map((l) => (l.key === key ? updater(l) : l)));
  }

  function handleAddSelected() {
    if (!addCatalogId) return;
    const cat = addableCatalog.find((c) => c.id === addCatalogId);
    if (!cat || selectedIds.has(cat.id)) return;
    onChange([...lines, addLineFromCatalog(cat)]);
    setAddCatalogId('');
  }

  return (
    <div>
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
                {allowEdit ? (
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    className="shrink-0 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {schema && typeof schema === 'object' && allowEdit
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

                {!schemaUsesCountField(schema) && allowEdit ? (
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

              {allowEdit ? (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {notesLabel}
                  </label>
                  <textarea
                    rows={3}
                    value={line.lineNotes}
                    onChange={(e) =>
                      patchLine(line.key, (l) => ({
                        ...l,
                        lineNotes: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                    placeholder={notesPlaceholder}
                  />
                </div>
              ) : null}
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
  );
}
