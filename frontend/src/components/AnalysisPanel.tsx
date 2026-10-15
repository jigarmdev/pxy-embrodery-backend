'use client';

import React from 'react';
import { Analysis } from '../lib/api';

const fmtMin = (m: number) => (m < 1 ? `${Math.round(m * 60)} s` : m < 60 ? `${m.toFixed(1)} min` : `${(m / 60).toFixed(1)} h`);

/** What the machine operator needs to know. Numbers are measured from the stitches; recommendations are guidelines. */
export default function AnalysisPanel({ analysis }: { analysis: Analysis | undefined | null }) {
  if (!analysis || analysis.empty) return null;
  const a = analysis;
  const tiles: [string, string][] = [
    ['Stitches', a.stitch_count.toLocaleString()],
    ['Colours', String(a.colors)],
    ['Thread', `${a.top_thread_m} m`],
    ['Size', `${a.width_mm} × ${a.height_mm} mm`],
    ['Complexity', a.complexity],
    ['Sew time', fmtMin(a.runtime_min)],
    ['Jumps / trims', `${a.jumps} / ${a.trims}`],
    ['Generated in', a.generation_ms != null ? `${a.generation_ms} ms` : '—'],
  ];
  const rec: [string, string][] = [
    ['Needle', a.recommend.needle],
    ['Stabilizer', a.recommend.stabilizer],
    ['Thread', a.recommend.thread],
  ];
  return (
    <section className="px-3 sm:px-4 py-4 border-t border-gray-200" aria-label="Design analysis">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-gray-900">Design analysis</h3>
        <p className="text-[11px] text-gray-400 text-right">Counts and size are measured from the file; recommendations are guidelines.</p>
      </div>

      <div className="grid grid-cols-2 @lg:grid-cols-4 gap-2">
        {tiles.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1.5 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{k}</div>
            <div className="text-sm font-bold text-gray-900 truncate">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 @2xl:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-3">
          <h4 className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-2">Recommended for {a.recommend.fabric}</h4>
          <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-xs">
            {rec.map(([k, v]) => (<React.Fragment key={k}><dt className="text-gray-500">{k}</dt><dd className="font-semibold text-gray-800">{v}</dd></React.Fragment>))}
          </dl>
          <p className="text-[11px] text-gray-500 mt-2">{a.recommend.note}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-3">
          <h4 className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-2">Checks</h4>
          {a.warnings.length === 0 ? (
            <p className="text-xs text-emerald-700 font-medium">✓ No problems found: stitch lengths, density and jumps look machine-ready.</p>
          ) : (
            <ul className="space-y-1.5">
              {a.warnings.map(w => (
                <li key={w.code} className={`text-xs flex gap-2 ${w.level === 'warn' ? 'text-amber-700' : 'text-gray-600'}`}>
                  <span aria-hidden>{w.level === 'warn' ? '⚠' : 'ℹ'}</span><span>{w.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {a.colours.some(c => c.hex) && (
        <div className="mt-3">
          <h4 className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-2">Thread list (sew order)</h4>
          <ol className="grid gap-1.5 @lg:grid-cols-2">
            {a.colours.map((c, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 text-xs">
                <span className="w-5 h-5 rounded border border-black/20 shrink-0" style={{ backgroundColor: c.hex }} />
                <span className="font-semibold text-gray-800">{i + 1}. {c.name ?? 'Colour'}</span>
                <span className="text-gray-400 font-mono">{c.hex}</span>
                <span className="ml-auto text-gray-500 tabular-nums">{c.stitches.toLocaleString()} st · {c.length_m} m</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
