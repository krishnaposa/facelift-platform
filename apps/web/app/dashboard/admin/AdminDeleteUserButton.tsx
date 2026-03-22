'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  userId: string;
  email: string;
  disabled?: boolean;
};

export default function AdminDeleteUserButton({ userId, email, disabled }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    const ok = window.confirm(
      `Permanently delete ${email}?\n\nThis removes their projects, bids, and messages. This cannot be undone.`
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Delete failed');
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      title={disabled ? 'You cannot delete your own account here.' : undefined}
      onClick={onDelete}
      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? '…' : 'Delete'}
    </button>
  );
}
