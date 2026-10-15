'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Design, DESIGNS, LETTERING_FONTS, designFile, drawDesignThumb, letteringFile } from '../lib/designs';

/** Thumbnail drawn on a canvas after mount, so server and client HTML are identical. */
function Thumb({ design }: { design: Design }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) drawDesignThumb(design, ref.current); }, [design]);
  return <canvas ref={ref} width={160} height={120} role="img" aria-label={design.name} className="w-full aspect-[4/3] bg-white block" />;
}

/** Built-in designs and a lettering generator. Hands the chosen artwork back as a File. */
export default function DesignLibrary({ onPick, compact = false, wide = false }: { onPick: (f: File) => void; compact?: boolean; wide?: boolean }) {
  const [text, setText] = useState('');
  const [font, setFont] = useState(LETTERING_FONTS[0].id);
  const [color, setColor] = useState('#14284b');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!compact);

  const make = async (fn: () => Promise<File>) => { setBusy(true); try { onPick(await fn()); } finally { setBusy(false); } };

  return (
    <div className="bg-surface p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-widest uppercase text-gray-400">Design library</h3>
        {compact && <span aria-hidden className="text-gray-400 text-xs">{open ? '▴' : '▾'}</span>}
      </button>
      {open && (
        <>
          <p className="text-xs text-gray-500 mt-2 mb-3">Try a ready-made design, or type your own lettering.</p>
          <div className={`grid grid-cols-2 sm:grid-cols-4 ${wide ? "" : "lg:grid-cols-2"} gap-2`}>
            {DESIGNS.map(d => (
              <button key={d.id} disabled={busy} onClick={() => make(() => designFile(d))}
                      className="group rounded-lg border border-gray-200 hover:border-indigo-400 overflow-hidden text-left disabled:opacity-60">
                <Thumb design={d} />
                <div className="px-2 py-1.5">
                  <div className="text-[11px] font-bold text-gray-800 leading-tight">{d.name}</div>
                  <div className="text-[10px] text-gray-400">{d.tag}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-700 mb-2">Lettering</h4>
            <input type="text" value={text} maxLength={14} placeholder="Type your text" aria-label="Lettering text"
                   onChange={e => setText(e.target.value)}
                   className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm placeholder:text-gray-400" />
            <div className="flex items-center gap-2 mt-2">
              <select value={font} onChange={e => setFont(e.target.value)} aria-label="Lettering font"
                      className="flex-1 h-10 rounded-lg border border-gray-200 bg-gray-50 px-2 text-sm">
                {LETTERING_FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} aria-label="Lettering colour"
                     className="h-10 w-12 rounded-lg border border-gray-200 bg-transparent p-1" />
            </div>
            <button type="button" disabled={busy || !text.trim()} onClick={() => make(() => letteringFile(text, font, color))}
                    className="mt-2 w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 transition-colors">
              Create lettering design
            </button>
          </div>
        </>
      )}
    </div>
  );
}
