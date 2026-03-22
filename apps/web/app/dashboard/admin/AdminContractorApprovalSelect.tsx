'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const;

type Props = {
  userId: string;
  value: string;
};

export default function AdminContractorApprovalSelect({ userId, value }: Props) {
  const router = useRouter();
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);

  async function onChange(next: string) {
    const prev = v;
    setV(next);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/contractors/${userId}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Update failed');
      }
      router.refresh();
    } catch {
      setV(prev);
      alert('Could not update approval status.');
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
      {OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
