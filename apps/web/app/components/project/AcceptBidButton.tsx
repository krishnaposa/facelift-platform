'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  projectId: string;
  bidId: string;
  label: string;
  disabled?: boolean;
};

export default function AcceptBidButton({ projectId, bidId, label, disabled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onAccept() {
    if (
      !window.confirm(
        `Accept this bid from ${label}? Other bids on this project will be marked declined and the project will be marked as awarded.`
      )
    ) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/bids/${bidId}/accept`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Could not accept bid.');
      }
      if (data?.emailSent === false) {
        window.alert(
          'Your bid was accepted, but the notification email could not be sent. Ask your contractor to log in to Facelift, or configure RESEND_API_KEY on the server.'
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={onAccept}
        className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Accepting…' : 'Accept this bid'}
      </button>
      {error ? (
        <p className="text-sm font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
