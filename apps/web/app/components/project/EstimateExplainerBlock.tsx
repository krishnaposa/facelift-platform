import type { EstimateExplainer } from '@/lib/project-cost';

type Props = {
  explainer: EstimateExplainer;
};

/** Strip accidental markdown from model output for plain-text UI. */
function plain(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

/**
 * Homeowner-facing breakdown of what the zip-level bid benchmark means.
 */
export default function EstimateExplainerBlock({ explainer }: Props) {
  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        Estimate explainer
      </p>
      <p className="text-xs text-slate-500">{plain(explainer.sourceNote)}</p>
      <p className="text-sm leading-relaxed text-slate-800">{plain(explainer.summary)}</p>
      <ul className="list-inside list-disc space-y-2 text-sm text-slate-700">
        {explainer.bullets.map((line, i) => (
          <li key={i} className="leading-relaxed">
            {plain(line)}
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-400">
        Not financial or legal advice. Actual bids depend on site conditions, materials, timing, and
        contractor availability.
      </p>
    </div>
  );
}
