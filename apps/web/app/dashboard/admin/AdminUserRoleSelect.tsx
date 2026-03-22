'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ROLES = ['HOMEOWNER', 'CONTRACTOR', 'ADMIN'] as const;

type Props = {
  userId: string;
  value: string;
};

export default function AdminUserRoleSelect({ userId, value }: Props) {
  const router = useRouter();
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);

  async function onChange(next: string) {
    const prev = v;
    setV(next);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Update failed');
      }
      router.refresh();
    } catch (e) {
      setV(prev);
      alert(e instanceof Error ? e.message : 'Could not update role.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={v}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
    >
      {ROLES.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
