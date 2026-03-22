'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'facelift_homeowner_projects_layout';

export type ProjectsLayoutMode = 'vertical' | 'horizontal';

export default function HomeownerProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<ProjectsLayoutMode>('horizontal');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'vertical' || raw === 'horizontal') {
      setMode(raw);
    }
  }, []);

  function setLayout(next: ProjectsLayoutMode) {
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700">Project layout</span>
        <div
          className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1"
          role="group"
          aria-label="Project layout"
        >
          <button
            type="button"
            onClick={() => setLayout('vertical')}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              mode === 'vertical'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vertical
          </button>
          <button
            type="button"
            onClick={() => setLayout('horizontal')}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              mode === 'horizontal'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Horizontal
          </button>
        </div>
      </div>

      <div
        className={
          mode === 'vertical'
            ? 'flex flex-col gap-5'
            : 'grid gap-5 md:grid-cols-2 xl:grid-cols-3'
        }
      >
        {children}
      </div>
    </div>
  );
}
