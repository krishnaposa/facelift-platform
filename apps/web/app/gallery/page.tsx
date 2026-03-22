import Link from 'next/link';

export default function Gallery() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Facelift</div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Inspiration Gallery</h1>
          </div>
          <Link
            href="/"
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
          >
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="mb-6 max-w-2xl text-sm text-slate-600 sm:text-base">
          Placeholder grid — gallery content will map from your catalog images.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="aspect-square animate-pulse rounded-lg bg-slate-200" />
          <div className="aspect-square animate-pulse rounded-lg bg-slate-200" />
          <div className="aspect-square animate-pulse rounded-lg bg-slate-200" />
        </div>
      </main>
    </div>
  );
}
