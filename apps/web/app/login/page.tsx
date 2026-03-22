'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { dashboardPathForRole, type SessionRole } from '@/lib/auth-routing';

export default function LoginPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<'homeowner' | 'contractor' | 'admin'>('homeowner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const expectedRole =
        accountType === 'contractor'
          ? 'CONTRACTOR'
          : accountType === 'admin'
            ? 'ADMIN'
            : 'HOMEOWNER';
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, expectedRole }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to log in.');
      }

      const role = (data?.user?.role as SessionRole | undefined) ?? 'HOMEOWNER';
      router.push(dashboardPathForRole(role));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10 sm:px-6 sm:py-12">
        <div className="w-full min-w-0 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Login
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-2 text-slate-600">
            Choose your account type so we send you to the right dashboard.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAccountType('homeowner')}
              className={`rounded-xl px-2 py-2 text-xs font-semibold sm:px-3 sm:text-sm ${
                accountType === 'homeowner'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              Homeowner
            </button>
            <button
              type="button"
              onClick={() => setAccountType('contractor')}
              className={`rounded-xl px-2 py-2 text-xs font-semibold sm:px-3 sm:text-sm ${
                accountType === 'contractor'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              Contractor
            </button>
            <button
              type="button"
              onClick={() => setAccountType('admin')}
              className={`rounded-xl px-2 py-2 text-xs font-semibold sm:px-3 sm:text-sm ${
                accountType === 'admin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Need an account?{' '}
            <Link href="/signup" className="font-semibold text-slate-900">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
