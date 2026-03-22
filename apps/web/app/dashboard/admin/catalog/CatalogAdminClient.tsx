'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

type ItemRow = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  unitLabel: string | null;
  active: boolean;
  optionsSchema: unknown;
  category: { name: string; slug: string };
};

type Props = {
  categories: CategoryRow[];
  items: ItemRow[];
};

export default function CatalogAdminClient({ categories, items }: Props) {
  const router = useRouter();

  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState('');

  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatSlug, setEditCatSlug] = useState('');

  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemSlug, setItemSlug] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [itemActive, setItemActive] = useState(true);
  const [itemSchema, setItemSchema] = useState('');
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError] = useState('');

  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemCategoryId, setEditItemCategoryId] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editItemSlug, setEditItemSlug] = useState('');
  const [editItemDesc, setEditItemDesc] = useState('');
  const [editItemUnit, setEditItemUnit] = useState('');
  const [editItemActive, setEditItemActive] = useState(true);
  const [editItemSchema, setEditItemSchema] = useState('');
  const [editItemSaving, setEditItemSaving] = useState(false);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: c.id, label: `${c.name} (${c.slug})` })),
    [categories]
  );

  function refresh() {
    router.refresh();
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setCatSaving(true);
    setCatError('');
    try {
      const res = await fetch('/api/admin/catalog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName.trim(),
          ...(catSlug.trim() ? { slug: catSlug.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setCatName('');
      setCatSlug('');
      refresh();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Error');
    } finally {
      setCatSaving(false);
    }
  }

  async function saveCategory(id: string) {
    setCatSaving(true);
    setCatError('');
    try {
      const res = await fetch(`/api/admin/catalog/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCatName.trim(),
          slug: editCatSlug.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setEditCatId(null);
      refresh();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Error');
    } finally {
      setCatSaving(false);
    }
  }

  async function deleteCategory(id: string) {
    if (!window.confirm('Delete this category? It must have no catalog items.')) return;
    setCatError('');
    try {
      const res = await fetch(`/api/admin/catalog/categories/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setEditCatId(null);
      refresh();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Error');
    }
  }

  function startEditCategory(c: CategoryRow) {
    setEditCatId(c.id);
    setEditCatName(c.name);
    setEditCatSlug(c.slug);
    setCatError('');
  }

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemCategoryId) {
      setItemError('Choose a category.');
      return;
    }
    setItemSaving(true);
    setItemError('');
    let optionsSchema: unknown = undefined;
    if (itemSchema.trim()) {
      try {
        optionsSchema = JSON.parse(itemSchema);
        if (typeof optionsSchema !== 'object' || optionsSchema === null || Array.isArray(optionsSchema)) {
          throw new Error('optionsSchema must be a JSON object.');
        }
      } catch (e) {
        setItemError(e instanceof Error ? e.message : 'Invalid JSON');
        setItemSaving(false);
        return;
      }
    }
    try {
      const res = await fetch('/api/admin/catalog/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: itemCategoryId,
          name: itemName.trim(),
          ...(itemSlug.trim() ? { slug: itemSlug.trim() } : {}),
          description: itemDesc.trim() || null,
          unitLabel: itemUnit.trim() || null,
          active: itemActive,
          optionsSchema,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setItemName('');
      setItemSlug('');
      setItemDesc('');
      setItemUnit('');
      setItemActive(true);
      setItemSchema('');
      refresh();
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Error');
    } finally {
      setItemSaving(false);
    }
  }

  function startEditItem(it: ItemRow) {
    setEditItemId(it.id);
    setEditItemCategoryId(it.categoryId);
    setEditItemName(it.name);
    setEditItemSlug(it.slug);
    setEditItemDesc(it.description ?? '');
    setEditItemUnit(it.unitLabel ?? '');
    setEditItemActive(it.active);
    setEditItemSchema(
      it.optionsSchema && typeof it.optionsSchema === 'object'
        ? JSON.stringify(it.optionsSchema, null, 2)
        : ''
    );
    setItemError('');
  }

  async function saveItem() {
    if (!editItemId) return;
    setEditItemSaving(true);
    setItemError('');
    let optionsSchema: unknown = undefined;
    if (editItemSchema.trim()) {
      try {
        optionsSchema = JSON.parse(editItemSchema);
        if (typeof optionsSchema !== 'object' || optionsSchema === null || Array.isArray(optionsSchema)) {
          throw new Error('optionsSchema must be a JSON object.');
        }
      } catch (e) {
        setItemError(e instanceof Error ? e.message : 'Invalid JSON');
        setEditItemSaving(false);
        return;
      }
    } else {
      optionsSchema = null;
    }
    try {
      const res = await fetch(`/api/admin/catalog/items/${editItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: editItemCategoryId,
          name: editItemName.trim(),
          slug: editItemSlug.trim(),
          description: editItemDesc.trim() || null,
          unitLabel: editItemUnit.trim() || null,
          active: editItemActive,
          optionsSchema,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setEditItemId(null);
      refresh();
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Error');
    } finally {
      setEditItemSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm('Delete this catalog item? It must not be used on any project line.')) return;
    setItemError('');
    try {
      const res = await fetch(`/api/admin/catalog/items/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setEditItemId(null);
      refresh();
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
        <p className="mt-1 text-sm text-slate-600">
          Group catalog upgrades. A category cannot be deleted while it still has items.
        </p>

        <form onSubmit={createCategory} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-700">New category name</label>
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Doors"
              required
            />
          </div>
          <div className="min-w-[160px]">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Slug (optional)</label>
            <input
              value={catSlug}
              onChange={(e) => setCatSlug(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="auto from name"
            />
          </div>
          <button
            type="submit"
            disabled={catSaving}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add category
          </button>
        </form>

        {catError ? (
          <p className="mt-2 text-sm font-medium text-red-600">{catError}</p>
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[520px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.slug}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => startEditCategory(c)}
                      className="mr-2 text-sm font-semibold text-sky-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCategory(c.id)}
                      className="text-sm font-semibold text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editCatId ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Edit category</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Name</label>
                <input
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Slug</label>
                <input
                  value={editCatSlug}
                  onChange={(e) => setEditCatSlug(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveCategory(editCatId)}
                disabled={catSaving}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditCatId(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Catalog items</h2>
        <p className="mt-1 text-sm text-slate-600">
          Individual upgrades (wizard + project lines). Slug must stay unique.{' '}
          <code className="rounded bg-slate-100 px-1 text-xs">optionsSchema</code> is JSON for option pickers
          (e.g. enums and <code className="rounded bg-slate-100 px-1 text-xs">count</code>).
        </p>

        <form onSubmit={createItem} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">Add item</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Category</label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Select…</option>
                {categoryOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Name</label>
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Slug (optional)</label>
              <input
                value={itemSlug}
                onChange={(e) => setItemSlug(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="auto from name"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
              <textarea
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Unit label</label>
              <input
                value={itemUnit}
                onChange={(e) => setItemUnit(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="each, linear ft, …"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="item-active"
                type="checkbox"
                checked={itemActive}
                onChange={(e) => setItemActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="item-active" className="text-sm font-semibold text-slate-700">
                Active
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">optionsSchema (JSON)</label>
              <textarea
                value={itemSchema}
                onChange={(e) => setItemSchema(e.target.value)}
                rows={4}
                placeholder='{"color": ["white", "black"], "count": "number"}'
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
              />
            </div>
          </div>
          {itemError ? <p className="text-sm font-medium text-red-600">{itemError}</p> : null}
          <button
            type="submit"
            disabled={itemSaving}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add catalog item
          </button>
        </form>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{it.name}</td>
                  <td className="px-4 py-3 text-slate-600">{it.slug}</td>
                  <td className="px-4 py-3 text-slate-600">{it.category.name}</td>
                  <td className="px-4 py-3">{it.active ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => startEditItem(it)}
                      className="mr-2 text-sm font-semibold text-sky-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(it.id)}
                      className="text-sm font-semibold text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editItemId ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Edit catalog item</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Category</label>
                <select
                  value={editItemCategoryId}
                  onChange={(e) => setEditItemCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {categoryOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Name</label>
                <input
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Slug</label>
                <input
                  value={editItemSlug}
                  onChange={(e) => setEditItemSlug(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  value={editItemDesc}
                  onChange={(e) => setEditItemDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Unit label</label>
                <input
                  value={editItemUnit}
                  onChange={(e) => setEditItemUnit(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="edit-item-active"
                  type="checkbox"
                  checked={editItemActive}
                  onChange={(e) => setEditItemActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="edit-item-active" className="text-sm font-semibold text-slate-700">
                  Active
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">optionsSchema (JSON)</label>
                <textarea
                  value={editItemSchema}
                  onChange={(e) => setEditItemSchema(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>
            </div>
            {itemError ? <p className="mt-2 text-sm font-medium text-red-600">{itemError}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveItem}
                disabled={editItemSaving}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save item
              </button>
              <button
                type="button"
                onClick={() => setEditItemId(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
