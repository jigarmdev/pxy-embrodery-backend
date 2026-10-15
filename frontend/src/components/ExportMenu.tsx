'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EXPORT_FORMATS, ExportFormat } from '../lib/api';

interface Props {
  onExport: (fmt: ExportFormat) => void | Promise<void>;
  disabled?: boolean;
  /** visual style of the trigger */
  variant?: 'solid' | 'outline';
  label?: string;
  compactLabel?: boolean;
}

/** One button, many machine formats. DST is the default action; the menu lists the others with the brands they suit. */
export default function ExportMenu({ onExport, disabled, variant = 'outline', label = 'Download', compactLabel = false }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const run = async (fmt: ExportFormat) => {
    setBusy(fmt);
    try { await onExport(fmt); setOpen(false); } finally { setBusy(null); }
  };
  const trigger = variant === 'solid'
    ? 'text-white bg-indigo-600 border-indigo-600 hover:bg-indigo-700 shadow-sm'
    : 'text-gray-700 bg-surface border-gray-200 hover:bg-gray-100';

  return (
    <div ref={root} className="relative inline-block">
      <div className={`inline-flex items-stretch rounded-lg border text-sm font-semibold transition-colors ${trigger} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <button type="button" onClick={() => run('dst')} className="h-9 px-3 inline-flex items-center gap-1.5" aria-label={`${label} DST`}>
          <span aria-hidden>⬇</span><span className={compactLabel ? 'hidden @lg:inline' : ''}>{label} DST</span>
        </button>
        <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Choose another file format"
                className="h-9 px-2 border-l border-current/20 inline-flex items-center">▾</button>
      </div>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-gray-200 bg-surface shadow-xl p-1">
          {EXPORT_FORMATS.map(f => (
            <button key={f.id} role="menuitem" type="button" onClick={() => run(f.id)} disabled={busy !== null}
                    className="w-full text-left rounded-lg px-3 py-2 hover:bg-gray-100 disabled:opacity-60 flex items-center gap-3">
              <span className="w-10 shrink-0 text-xs font-bold text-indigo-600">{f.label}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-gray-800 font-medium truncate">{f.brands}</span>
                <span className="block text-[10px] text-gray-400">{f.colours ? 'Includes thread colours' : 'No colour info in this format'}</span>
              </span>
              {busy === f.id && <span className="text-xs text-gray-400">…</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
