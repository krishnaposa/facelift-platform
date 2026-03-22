'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const STATUSES = [
  'DRAFT',
  'OPEN',
  'IN_REVIEW',
  'AWARDED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

type Props = {
  projectId: string;
  initial: {
    title: string;
    description: string | null;
    zipCode: string;
    status: string;
    adminNotes: string | null;
  };
};

export default function AdminProjectEditForm({ projectId, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? '');
  const [zipCode, setZipCode] = useState(initial.zipCode);
  const [status, setStatus] = useState(initial.status);
  const [adminNotes, setAdminNotes] = useState(initial.adminNotes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setOk(false);

    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          zipCode: zipCode.trim(),
          status,
          adminNotes: adminNotes.trim() || null,
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
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
          required
          maxLength={200}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Zip code</label>
        <input
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
          required
          maxLength={32}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Description (homeowner-facing)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Admin notes (internal)
        </label>
        <p className="mb-2 text-xs text-slate-500">
          Follow-ups with homeowners or contractors, compliance checks, or coordination — not shown on the
          contractor bid screen.
        </p>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
        />
      </div>

      {error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      ) : null}
      {ok ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Saved.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
