'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MethodPreview } from '../lib/api';
import { renderScene } from '../lib/dstRender';
import { ThreadType, DEFAULT_THREAD, VARIEGATED_STOPS } from '../lib/threads';

const SAMPLE = { w: 38, h: 26 };           // mm, matches the backend sample shape
const FABRIC = '#f4efe6';
const THREAD_COLOR = '#b8322a';

function useDraw(
  canvasRef: React.RefObject<HTMLCanvasElement | null>, data: MethodPreview | undefined, thread: ThreadType,
  zoom: number, size: { w: number; h: number }, focus: [number, number],
) {
  useEffect(() => {
    const cvs = canvasRef.current, ctx = cvs?.getContext('2d');
    if (!cvs || !ctx || !size.w) return;
    const dpr = window.devicePixelRatio || 1;
    cvs.width = Math.round(size.w * dpr); cvs.height = Math.round(size.h * dpr);
    const base = Math.min(size.w / SAMPLE.w, size.h / SAMPLE.h) * 0.92;
    const s = base * zoom;
    renderScene({
      ctx, w: size.w, h: size.h, dpr,
      view: { s, x: size.w / 2 - focus[0] * s, y: size.h / 2 + focus[1] * s },
      blocks: data ? [{ stitches: data.stitches }] : [], colors: [THREAD_COLOR], hidden: new Set(), limit: Number.MAX_SAFE_INTEGER,
      mode: 'file', showJumps: false, fabric: FABRIC, rulers: false, thread, stops: VARIEGATED_STOPS,
    });
  }, [canvasRef, data, thread, zoom, size, focus]);
}

function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const CENTER: [number, number] = [0, 0];
const FOCUS: [number, number] = [-13, 3];

/** Small card thumbnail: the real stitches of a stitch method on a sample ring. */
export function StitchSwatch({ data, thread = DEFAULT_THREAD, fallback }: { data?: MethodPreview; thread?: ThreadType; fallback?: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null), cvs = useRef<HTMLCanvasElement>(null);
  const size = useSize(wrap);
  useDraw(cvs, data, thread, 1, size, CENTER);
  return (
    <div ref={wrap} className="relative w-full h-14 rounded-md overflow-hidden" style={{ backgroundColor: FABRIC }}>
      <canvas ref={cvs} className="absolute inset-0 w-full h-full" />
      {!data && <div className="absolute inset-0 flex items-center justify-center text-xl text-gray-400">{fallback ?? '…'}</div>}
    </div>
  );
}

/** Larger live preview of the selected method with overview / close-up zoom, drawn with the realistic thread. */
export function StitchPreviewPanel({ name, desc, data, thread = DEFAULT_THREAD }: { name: string; desc: string; data?: MethodPreview; thread?: ThreadType }) {
  const [zoom, setZoom] = useState(4);
  const wrap = useRef<HTMLDivElement>(null), cvs = useRef<HTMLCanvasElement>(null);
  const size = useSize(wrap);
  useDraw(cvs, data, thread, zoom, size, zoom > 1 ? FOCUS : CENTER);
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-gray-800">Real-life preview · {name}</div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5" role="group" aria-label="Preview zoom">
          {[1, 4, 10].map(z => (
            <button key={z} onClick={() => setZoom(z)} aria-pressed={zoom === z}
                    className={`px-2 h-6 text-[11px] font-semibold rounded-md ${zoom === z ? 'bg-surface text-gray-900 shadow-sm' : 'text-gray-500'}`}>{z}×</button>
          ))}
        </div>
      </div>
      <div ref={wrap} className="relative w-full h-44 sm:h-52 rounded-lg overflow-hidden border border-gray-200" style={{ backgroundColor: FABRIC }}>
        <canvas ref={cvs} className="absolute inset-0 w-full h-full" />
        {!data && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">Loading preview…</div>}
      </div>
      <p className="text-[11px] text-gray-500 mt-1.5">
        {data ? `${data.stitch_count.toLocaleString()} stitches on a 38 × 26 mm sample. ` : ''}{desc}
      </p>
    </div>
  );
}
