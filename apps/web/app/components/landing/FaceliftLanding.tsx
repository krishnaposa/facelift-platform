import Link from "next/link";
import type { GalleryImageForProject } from "@/lib/project-gallery";

type Props = {
  gallery: GalleryImageForProject[];
};

export default function FaceliftLanding({ gallery }: Props) {
  const categories = [
    { title: 'Front Doors', desc: 'Single door, double door, sidelights, modern styles' },
    { title: 'Bathrooms', desc: 'Bidets, vanities, fixtures, mirrors, hardware' },
    { title: 'Kitchens', desc: 'Cabinet refacing, countertops, hardware, backsplashes' },
    { title: 'Staircases', desc: 'Spindles, railings, posts, trim refreshes' },
    { title: 'Air & Vent Covers', desc: 'Modern vent covers, returns, smart airflow updates' },
    { title: 'Smart Home', desc: 'Locks, doorbells, thermostats, lighting, sensors' },
  ];

  const bids = [
    { contractor: 'Apex Home Works', price: '$7,800', eta: '12 days', match: 'Full project bid' },
    { contractor: 'Blue Oak Renovations', price: '$4,200', eta: '6 days', match: 'Front door + spindles' },
    { contractor: 'SmartNest Install Co.', price: '$1,250', eta: '2 days', match: 'Bidets + smart devices' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-2xl font-bold tracking-tight">Facelift</div>
            <div className="text-sm text-slate-500">Home upgrades, visualized and bid online</div>
          </div>
          <nav className="hidden items-center gap-4 md:flex text-sm font-medium">
            <a href="#gallery" className="hover:text-slate-600">Gallery</a>
            <a href="#login" className="hover:text-slate-600">Login</a>
            <Link
              href="/login"
              className="rounded-2xl bg-slate-900 px-4 py-2 text-white shadow-sm"
            >
              Homeowner Login
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 shadow-sm"
            >
              Contractor Login
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            Home facelift marketplace
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Upgrade your home, choose the exact items, and get contractor bids.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              Homeowners browse ideas, select upgrades like doors, bidets, cabinet refacing, railings, vents, and countertops, then receive bids from verified contractors.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Homeowner Login
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900"
            >
              Contractor Login
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

        <div className="grid gap-4">
          <div className="rounded-[28px] bg-white p-5 shadow-lg ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-500">Sample project</div>
                <div className="text-xl font-semibold">Front Exterior Refresh</div>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Open for bids</span>
            </div>
            <div className="space-y-3 text-sm">
              {['Replace front door with double door', 'Replace stair spindles', 'Swap air vents', 'Add smart lock + doorbell'].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>{item}</span>
                  <span className="text-slate-500">Selected</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] bg-slate-900 p-5 text-white shadow-lg">
            <div className="mb-4 text-lg font-semibold">Recent bid activity</div>
            <div className="space-y-3">
              {bids.map((bid) => (
                <div key={bid.contractor} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{bid.contractor}</div>
                    <div className="font-semibold">{bid.price}</div>
                  </div>
                  <div className="mt-1 text-sm text-slate-300">{bid.match}</div>
                  <div className="mt-2 text-xs uppercase tracking-wide text-slate-400">ETA {bid.eta}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Services</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Popular upgrade categories</h2>
          </div>
          <button className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium">View full catalog</button>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <div key={category.title} className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Upgrade type
              </div>
              <h3 className="text-xl font-semibold">{category.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{category.desc}</p>
              <button className="mt-5 text-sm font-semibold text-slate-900">Select options →</button>
            </div>
          ))}
        </div>
      </section>

      <section id="gallery" className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Gallery</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Inspiration without login</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Let visitors explore before and after concepts, then convert that inspiration into a project request.
          </p>
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
                <img
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
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
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
            <button className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Homeowner Sign Up</button>
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
            <button className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900">Contractor Apply</button>
          </div>
        </div>
      </section>

      <section id="login" className="mx-auto max-w-7xl px-6 py-10 pb-16">
        <div className="rounded-[32px] bg-gradient-to-br from-slate-900 to-slate-700 p-8 text-white shadow-xl">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Starter auth section</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Separate entry points for both sides of the marketplace</h2>
              <p className="mt-3 max-w-xl text-slate-300">
                Start with distinct homeowner and contractor login flows, then route each role into its own dashboard.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] bg-white p-5 text-slate-900">
                <div className="text-lg font-semibold">Homeowner Login</div>
                <p className="mt-2 text-sm text-slate-600">Track projects, uploads, and contractor bids.</p>
                <Link
                  href="/login"
                  className="mt-5 block w-full rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Continue
                </Link>
              </div>
              <div className="rounded-[24px] bg-white p-5 text-slate-900">
                <div className="text-lg font-semibold">Contractor Login</div>
                <p className="mt-2 text-sm text-slate-600">View open requests and submit bids by scope.</p>
                <Link
                  href="/login"
                  className="mt-5 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-900"
                >
                  Continue
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
