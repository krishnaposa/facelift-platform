import Link from "next/link";
import SafeImage from "@/app/components/ui/SafeImage";
import { formatUsdWhole } from "@/lib/format-currency";
import type { GalleryImageForProject } from "@/lib/project-gallery";
import type { LandingCatalogItem } from "@/lib/catalog-landing";

type Props = {
  gallery: GalleryImageForProject[];
  usaCost: {
    hasData: boolean;
    average: number | null;
    min: number | null;
    max: number | null;
    count: number;
  };
  catalogItems: LandingCatalogItem[];
};

export default function FaceliftLanding({ gallery, usaCost, catalogItems }: Props) {
  const suggestedUpgrades = Array.from(
    new Set(gallery.map((g) => g.catalogItemName).filter(Boolean) as string[])
  ).slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight">Facelift</div>
            <div className="text-sm text-slate-500">Home upgrades, visualized and bid online</div>
          </div>
          <nav className="hidden items-center gap-3 text-sm font-medium md:flex">
            <a href="#inspiration" className="hover:text-slate-600">Gallery</a>
            <Link href="/signup" className="hover:text-slate-600">Sign up</Link>
            <Link
              href="/login"
              className="rounded-2xl bg-slate-900 px-4 py-2 text-white shadow-sm"
            >
              Log in
            </Link>
          </nav>
          <div className="flex flex-wrap items-center gap-2 md:hidden">
            <a
              href="#inspiration"
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Gallery
            </a>
            <Link
              href="/signup"
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Log in
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            Home facelift marketplace
          </span>
          <div className="space-y-4">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Upgrade your home, choose the exact items, and get contractor bids.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              Homeowners browse ideas, select upgrades like doors, bidets, cabinet refacing, railings, vents, and countertops, then receive bids from verified contractors.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900"
            >
              Log in
            </Link>
          </div>
          <div className="grid gap-4 pt-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="text-2xl font-bold">100+</div>
              <div className="text-sm text-slate-500">upgrade combinations</div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="text-2xl font-bold">48 hrs</div>
              <div className="text-sm text-slate-500">target first bids</div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="text-2xl font-bold">2 sided</div>
              <div className="text-sm text-slate-500">homeowner + contractor</div>
            </div>
          </div>
        </div>
      </section>

      <section id="inspiration" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Gallery</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Inspiration without login</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Let visitors explore before and after concepts, then convert that inspiration into a project request.
          </p>
          {suggestedUpgrades.length > 0 && (
            <div className="mt-4 text-sm text-slate-600">
              AI suggests:{" "}
              <span className="font-semibold text-slate-900">
                {suggestedUpgrades.join(", ")}
              </span>
            </div>
          )}
        </div>

        {gallery.length === 0 ? (
          <p className="text-slate-500">Gallery coming soon.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200"
              >
                <SafeImage
                  src={item.imageUrl}
                  alt={item.title || item.catalogItemName || 'Gallery'}
                  className="h-64 w-full object-cover"
                />
                <div className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {item.catalogItemName || item.styleTag || 'Gallery'}
                  </div>
                  <div className="mt-2 text-xl font-semibold">
                    {item.title || item.caption || 'Inspiration image'}
                  </div>
                  <button className="mt-4 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium">
                    Use this as inspiration
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div id="catalog" className="mt-12 mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Catalog
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Popular upgrade categories
            </h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Every upgrade type from your catalog, with a thumbnail and options from your data.
              When contractors have submitted line-item bids, we show a typical installation amount.
              Thumbnails use your gallery when available; otherwise a curated placeholder.
            </p>
            {usaCost.hasData ? (
              <div className="mt-3 text-sm text-slate-600">
                USA average bid:{" "}
                <span className="font-semibold text-slate-900">
                  ${usaCost.average?.toFixed(0)}
                </span>
                {usaCost.min !== null && usaCost.max !== null ? (
                  <span className="text-slate-500">
                    {" "}
                    (typical range ${usaCost.min.toFixed(0)} – ${usaCost.max.toFixed(0)})
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <Link
            href="/login"
            className="shrink-0 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-900"
          >
            Start a project
          </Link>
        </div>

        {catalogItems.length === 0 ? (
          <p className="text-sm text-slate-500">
            Catalog could not be loaded. Check your database connection and run{" "}
            <code className="rounded bg-slate-100 px-1">npx prisma migrate dev</code> and{" "}
            <code className="rounded bg-slate-100 px-1">npx prisma db seed</code>.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {catalogItems.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  <SafeImage
                    src={item.thumbnailUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                    {item.categoryName}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-slate-900">{item.name}</h3>
                  {item.description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  ) : null}
                  {item.avgInstallCost.hasData && item.avgInstallCost.average != null ? (
                    <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm ring-1 ring-emerald-100">
                      <div className="font-semibold text-emerald-900">
                        Avg. install: {formatUsdWhole(item.avgInstallCost.average)}
                        {item.avgInstallCost.min != null && item.avgInstallCost.max != null ? (
                          <span className="font-normal text-emerald-800/90">
                            {' '}
                            ({formatUsdWhole(item.avgInstallCost.min)} –{' '}
                            {formatUsdWhole(item.avgInstallCost.max)})
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-emerald-800/80">
                        From {item.avgInstallCost.count} bid line item
                        {item.avgInstallCost.count === 1 ? '' : 's'} on this upgrade (not a quote).
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Typical install cost appears here once contractors submit line-item bids for this
                      upgrade.
                    </p>
                  )}
                  <ul className="mt-4 space-y-2">
                    {item.subItems.map((line) => (
                      <li
                        key={line}
                        className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className="mt-5 inline-flex text-sm font-semibold text-slate-900 underline-offset-4 hover:underline"
                  >
                    Sign in to build a project →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">For homeowners</div>
            <h3 className="mt-2 text-2xl font-semibold">Build a project in minutes</h3>
            <ul className="mt-5 space-y-3 text-sm text-slate-600">
              <li>Choose individual upgrades or full refresh bundles</li>
              <li>Upload photos of your current space</li>
              <li>Get bids from qualified contractors</li>
              <li>Compare price, timing, and scope side by side</li>
            </ul>
            <Link
              href="/signup"
              className="mt-6 inline-block rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
            >
              Sign up
            </Link>
          </div>
          <div id="contractors" className="rounded-[28px] bg-slate-900 p-8 text-white shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">For contractors</div>
            <h3 className="mt-2 text-2xl font-semibold">Bid on the work items you want</h3>
            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li>Bid on complete projects or selected line items</li>
              <li>Target zip codes and service categories</li>
              <li>Showcase past work in your profile</li>
              <li>Grow with repeat homeowner demand</li>
            </ul>
            <Link
              href="/signup"
              className="mt-6 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
