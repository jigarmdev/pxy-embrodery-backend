'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cropFile } from '../lib/imagePrep';

type Box = { x: number; y: number; w: number; h: number };   // fractions of the image
type Drag = { kind: 'move' | 'new' | 'nw' | 'ne' | 'sw' | 'se'; sx: number; sy: number; box: Box };

const MIN = 0.03;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Drag a box around the logo (the mark) and use only that part. */
export default function CropModal({ file, onApply, onClose }: { file: File; onApply: (f: File) => void; onClose: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 1, h: 1 });
  const [busy, setBusy] = useState(false);
  const whole = box.x === 0 && box.y === 0 && box.w === 1 && box.h === 1;
  const cvs = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => { if (!cancelled) setImg(i); URL.revokeObjectURL(url); };   // decoded: the URL is no longer needed
    i.onerror = () => URL.revokeObjectURL(url);
    i.src = url;
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // fit the image into the available space
  useEffect(() => {
    const el = wrap.current;
    if (!img || !el) return;
    const fit = () => {
      if (!el.isConnected) return;   // the observer can fire once more while the dialog is closing
      const maxW = el.clientWidth, maxH = Math.min(window.innerHeight * 0.58, 560);
      const k = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
      setSize({ w: Math.round(img.naturalWidth * k), h: Math.round(img.naturalHeight * k) });
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, [img]);

  useEffect(() => {
    const c = cvs.current;
    if (!c || !img || !size.w) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size.w * dpr; c.height = size.h * dpr;
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // checkerboard so transparent logos are visible
    for (let y = 0; y < size.h; y += 12) for (let x = 0; x < size.w; x += 12) { g.fillStyle = ((x + y) / 12) % 2 ? '#e5e7eb' : '#f9fafb'; g.fillRect(x, y, 12, 12); }
    g.drawImage(img, 0, 0, size.w, size.h);
    const bx = box.x * size.w, by = box.y * size.h, bw = box.w * size.w, bh = box.h * size.h;
    g.fillStyle = 'rgba(15,23,42,0.55)';
    g.fillRect(0, 0, size.w, by); g.fillRect(0, by + bh, size.w, size.h - by - bh); g.fillRect(0, by, bx, bh); g.fillRect(bx + bw, by, size.w - bx - bw, bh);
    g.strokeStyle = '#6366f1'; g.lineWidth = 2; g.strokeRect(bx, by, bw, bh);
    g.fillStyle = '#fff'; g.strokeStyle = '#6366f1';
    for (const [hx, hy] of [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]]) { g.beginPath(); g.rect(hx - 6, hy - 6, 12, 12); g.fill(); g.stroke(); }
  }, [img, size, box]);

  const point = (e: React.PointerEvent) => {
    const r = cvs.current!.getBoundingClientRect();
    return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1), r };
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = point(e);
    const tol = 14 / p.r.width, tolY = 14 / p.r.height;
    const near = (cx: number, cy: number) => Math.abs(p.x - cx) < tol && Math.abs(p.y - cy) < tolY;
    let kind: Drag['kind'] = 'new';
    if (near(box.x, box.y)) kind = 'nw';
    else if (near(box.x + box.w, box.y)) kind = 'ne';
    else if (near(box.x, box.y + box.h)) kind = 'sw';
    else if (near(box.x + box.w, box.y + box.h)) kind = 'se';
    else if (!whole && p.x > box.x && p.x < box.x + box.w && p.y > box.y && p.y < box.y + box.h) kind = 'move';   // on an uncropped image a drag draws a new box
    drag.current = { kind, sx: p.x, sy: p.y, box };
    if (kind === 'new') setBox({ x: p.x, y: p.y, w: MIN, h: MIN });
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = point(e);
    const b = d.box;
    if (d.kind === 'move') {
      setBox({ ...b, x: clamp(b.x + p.x - d.sx, 0, 1 - b.w), y: clamp(b.y + p.y - d.sy, 0, 1 - b.h) });
    } else if (d.kind === 'new') {
      const x0 = Math.min(d.sx, p.x), y0 = Math.min(d.sy, p.y);
      setBox({ x: x0, y: y0, w: Math.max(MIN, Math.abs(p.x - d.sx)), h: Math.max(MIN, Math.abs(p.y - d.sy)) });
    } else {
      let x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h;
      if (d.kind === 'nw' || d.kind === 'sw') x0 = clamp(p.x, 0, x1 - MIN); else x1 = clamp(p.x, x0 + MIN, 1);
      if (d.kind === 'nw' || d.kind === 'ne') y0 = clamp(p.y, 0, y1 - MIN); else y1 = clamp(p.y, y0 + MIN, 1);
      setBox({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
  };

  const apply = useCallback(async () => {
    setBusy(true);
    try { onApply(await cropFile(file, box)); } finally { setBusy(false); }
  }, [file, box, onApply]);

  return (
    <div className="themed fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3" role="dialog" aria-modal="true" aria-label="Crop artwork"
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface text-gray-900 w-full max-w-3xl rounded-2xl border border-gray-200 shadow-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-bold">Crop to the mark</h2>
            <p className="text-xs text-gray-500">Drag a box around the logo. Only that part is digitized and scaled to your hoop.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div ref={wrap} className="flex justify-center touch-none select-none">
          {img ? <canvas ref={cvs} style={{ width: size.w, height: size.h }} className="rounded-lg cursor-crosshair"
                         onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} />
               : <p className="py-16 text-sm text-gray-500">Loading…</p>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 mt-4">
          <button onClick={() => setBox({ x: 0, y: 0, w: 1, h: 1 })} disabled={whole} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40">Reset</button>
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100">Cancel</button>
          <button onClick={apply} disabled={busy || whole} className="h-10 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50">
            {busy ? 'Cropping…' : 'Use this crop'}
          </button>
        </div>
      </div>
    </div>
  );
}
