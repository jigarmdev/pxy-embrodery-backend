'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseDst, ParsedDst, Placement, Analysis, ExportFormat, exportDesignBlob, saveBlob, safeFileName } from '../lib/api';
import AnalysisPanel from './AnalysisPanel';
import ExportMenu from './ExportMenu';
import { renderScene, RULER } from '../lib/dstRender';
import { THREAD_TYPES, THREAD_COLORS, VARIEGATED_STOPS, DEFAULT_THREAD } from '../lib/threads';

export interface DstSource {
  blob: Blob;
  name: string;
  /** Optional thread colours per colour block (a DST file itself stores none). */
  colors?: string[];
  /** Original artwork + where the digitizer placed it, enables the Before / After mode. */
  original?: Blob;
  placement?: Placement | null;
  /** The hoop the design was scaled to fill (mm); drawn as a dashed outline. */
  hoop?: { w: number; h: number };
  /** Measured analysis from the digitizer (for opened files the backend computes it while decoding). */
  analysis?: Analysis;
  fabric?: string;
}

type Mode = 'file' | 'plan' | 'compare';
const MODES: { id: Mode; label: string; short: string }[] = [
  { id: 'file', label: 'Embroidery file', short: 'Embroidery' },
  { id: 'plan', label: 'Stitch plan', short: 'Plan' },
  { id: 'compare', label: 'Before / After', short: 'Compare' },
];

const FALLBACK_COLORS = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0f172a'];
const FABRICS = [
  { name: 'White', color: '#ffffff' },
  { name: 'Cream', color: '#f5f0e8' },
  { name: 'Grey', color: '#475569' },
  { name: 'Navy', color: '#0f1b33' },
  { name: 'Black', color: '#0a0a0a' },
];

interface Props {
  source: DstSource | null;
  threadId?: string;
  onThreadChange?: (id: string) => void;
}

/** Keyed inner viewer: opening another file remounts it, so no state needs resetting. */
export default function DstPreview({ source: initial, threadId = DEFAULT_THREAD.id, onThreadChange }: Props) {
  const [picked, setPicked] = useState<{ src: DstSource; id: number } | null>(null);
  const src = picked?.src ?? initial;
  if (!src) return null;
  return (
    <Viewer
      key={picked?.id ?? 0}
      source={src}
      threadId={threadId}
      onThreadChange={onThreadChange}
      onPick={f => setPicked({ src: { blob: f, name: f.name }, id: (picked?.id ?? 0) + 1 })}
    />
  );
}

function Viewer({ source, onPick, threadId, onThreadChange }: { source: DstSource; onPick: (f: File) => void; threadId: string; onThreadChange?: (id: string) => void }) {
  const [dst, setDst] = useState<ParsedDst | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fabric, setFabric] = useState(FABRICS[0].color);
  const [showJumps, setShowJumps] = useState(false);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(1); // 0..1 of all stitches
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [mode, setMode] = useState<Mode>('file');
  const [split, setSplit] = useState(0.5);                       // before/after divider, fraction of width
  const [origImg, setOrigImg] = useState<HTMLImageElement | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [overHandle, setOverHandle] = useState(false);
  const splitDrag = useRef<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [selBlock, setSelBlock] = useState<number | null>(null);
  const [localThread, setLocalThread] = useState(threadId);
  const thread = THREAD_TYPES.find(t => t.id === (onThreadChange ? threadId : localThread)) ?? DEFAULT_THREAD;
  const pickThread = (id: string) => (onThreadChange ? onThreadChange(id) : setLocalThread(id));
  const [measureOn, setMeasureOn] = useState(false);
  const [measure, setMeasure] = useState<[number, number][]>([]);  // up to two points, in mm
  const [fullscreen, setFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const downPos = useRef<{ x: number; y: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; s: number } | null>(null);

  // Decode the file with the backend (pyembroidery) whenever the source changes
  useEffect(() => {
    let cancelled = false;
    parseDst(source.blob, source.name, source.fabric ?? 'cotton')
      .then(d => { if (!cancelled) setDst(d); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source]);

  // Load the original artwork for the before/after view
  useEffect(() => {
    if (!source.original) return;
    let cancelled = false;
    const url = URL.createObjectURL(source.original);
    const img = new Image();
    img.onload = () => { if (!cancelled) setOrigImg(img); URL.revokeObjectURL(url); }; // decoded; the URL is no longer needed
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
    return () => { cancelled = true; };
  }, [source.original]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const canCompare = !!(source.original && source.placement);

  const colors = useMemo(
    () => (dst?.blocks ?? []).map((_, i) => overrides[i] ?? source.colors?.[i] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]),
    [dst, source, overrides],
  );
  const total = useMemo(() => (dst?.blocks ?? []).reduce((n, b) => n + b.stitches.length, 0), [dst]);

  const fit = useCallback(() => {
    if (!dst) return;
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    let [x0, y0, x1, y1] = dst.bounds_mm;
    if (source.hoop) { x0 = Math.min(x0, -source.hoop.w / 2); x1 = Math.max(x1, source.hoop.w / 2); y0 = Math.min(y0, -source.hoop.h / 2); y1 = Math.max(y1, source.hoop.h / 2); }
    const bw = Math.max(x1 - x0, 1), bh = Math.max(y1 - y0, 1);
    const aw = w - RULER, ah = h - RULER; // leave room for the rulers
    const s = Math.min(aw / bw, ah / bh) * 0.88;
    setView({ s, x: RULER + aw / 2 - ((x0 + x1) / 2) * s, y: RULER + ah / 2 + ((y0 + y1) / 2) * s }); // y flipped (DST is y-up)
  }, [dst, source.hoop]);

  // Canvas sizing (HiDPI aware) and refit
  useEffect(() => {
    const wrap = wrapRef.current, cvs = canvasRef.current;
    if (!wrap || !cvs) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      sizeRef.current = { w, h };
      cvs.width = Math.round(w * dpr); cvs.height = Math.round(h * dpr);
      cvs.style.width = w + 'px'; cvs.style.height = h + 'px';
      fit();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fit]);

  // Draw
  useEffect(() => {
    const cvs = canvasRef.current;
    const ctx = cvs?.getContext('2d');
    if (!cvs || !ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    if (!dst) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = fabric; ctx.fillRect(0, 0, w, h); return; }

    renderScene({
      ctx, w, h, dpr, view, blocks: dst.blocks, colors, hidden,
      limit: Math.floor(total * progress), mode: mode === 'compare' ? 'file' : mode,
      showJumps, fabric, rulers: mode !== 'compare', thread, stops: VARIEGATED_STOPS, hoop: source.hoop,
    });

    if (mode !== 'compare' && measure.length) {
      const P = measure.map(([x, y]) => [x * view.s + view.x, -y * view.s + view.y] as const);
      ctx.save();
      ctx.strokeStyle = '#2563eb'; ctx.fillStyle = '#2563eb'; ctx.lineWidth = 2; ctx.setLineDash([]);
      if (P.length === 2) { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[1][0], P[1][1]); ctx.stroke(); }
      for (const [x, y] of P) { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = '#2563eb'; }
      if (P.length === 2) {
        const dx = measure[1][0] - measure[0][0], dy = measure[1][1] - measure[0][1];
        const label = `${Math.hypot(dx, dy).toFixed(2)} mm`, sub = `Δx ${Math.abs(dx).toFixed(2)}  Δy ${Math.abs(dy).toFixed(2)}`;
        const mx = (P[0][0] + P[1][0]) / 2, my = (P[0][1] + P[1][1]) / 2;
        ctx.font = '600 13px ui-monospace, monospace';
        const tw = Math.max(ctx.measureText(label).width, ctx.measureText(sub).width * 0.85) + 16;
        ctx.fillStyle = 'rgba(15,23,42,0.92)'; ctx.beginPath(); ctx.roundRect(mx - tw / 2, my - 56, tw, 38, 8); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, mx, my - 44);
        ctx.font = '10px ui-monospace, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText(sub, mx, my - 30);
      }
      ctx.restore();
    }

    if (mode === 'compare') {
      const sx = Math.round(split * w);
      ctx.save();
      ctx.beginPath(); ctx.rect(sx, 0, w - sx, h); ctx.clip();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      if (origImg && source.placement) {
        // same mapping the digitizer used: pixel (u, v) of the resized image -> ((u - cx) * scale, -(v - cy) * scale) mm
        const { scale, resized, crop_center } = source.placement;
        const k = (scale * resized[0]) / origImg.naturalWidth;                    // mm per natural pixel
        const iw = origImg.naturalWidth * k * view.s, ih = origImg.naturalHeight * k * view.s;
        const cxMm = (resized[0] / 2 - crop_center[0]) * scale, cyMm = -(resized[1] / 2 - crop_center[1]) * scale;
        ctx.drawImage(origImg, view.x + cxMm * view.s - iw / 2, view.y - cyMm * view.s - ih / 2, iw, ih);
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(sx - 1, 0, 2, h);
      ctx.beginPath(); ctx.arc(sx, h / 2, 17, 0, Math.PI * 2);
      ctx.fillStyle = '#eceef4'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#2b2f3c'; ctx.font = '600 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('↔', sx, h / 2 + 1);
      ctx.font = '600 11px system-ui, sans-serif';
      for (const [label, x, align] of [['EMBROIDERY', 10, 'left'], ['ORIGINAL', w - 10, 'right']] as const) {
        ctx.textAlign = align; ctx.fillStyle = 'rgba(15,23,42,0.55)'; ctx.fillText(label, x, 16);
      }
    }
  }, [dst, view, fabric, showJumps, hidden, progress, total, colors, mode, split, origImg, source.placement, source.hoop, measure, thread]);

  // Playback
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const step = () => {
      setProgress(p => {
        const next = p + 1 / (60 * 6); // ~6 s stitch-out at 60 fps, whatever the file size
        if (next >= 1) { setPlaying(false); return 1; }
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Pan / zoom: wheel, drag, two-finger pinch
  const zoomAt = (cx: number, cy: number, factor: number) =>
    setView(v => {
      const s = Math.min(400, Math.max(0.5, v.s * factor));
      const k = s / v.s;
      return { s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });

  // Native non-passive listener: React's onWheel is passive, so the page would scroll while zooming
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = wrap.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    wrap.addEventListener('wheel', onWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', onWheel);
  }, []);
  const nearHandle = (clientX: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return mode === 'compare' && Math.abs(clientX - r.left - split * r.width) < 26;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    downPos.current = { x: e.clientX, y: e.clientY };
    if (nearHandle(e.clientX)) { splitDrag.current = e.pointerId; return; }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    if (splitDrag.current === e.pointerId) { setSplit(Math.min(0.98, Math.max(0.02, (e.clientX - r.left) / r.width))); return; }
    const p = pointers.current.get(e.pointerId);
    if (!p) { // hover: live mm coordinates + handle cursor
      setCursor({ x: (e.clientX - r.left - view.x) / view.s, y: -(e.clientY - r.top - view.y) / view.s });
      setOverHandle(nearHandle(e.clientX));
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const target = (pinchRef.current.s * dist) / pinchRef.current.dist;
      zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, target / view.s);
    } else if (pointers.current.size === 1) {
      setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (splitDrag.current === e.pointerId) splitDrag.current = null;
    const d = downPos.current;
    if (measureOn && mode !== 'compare' && d && pointers.current.has(e.pointerId) && pointers.current.size === 1
        && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) { // a click, not a drag
      const r = canvasRef.current!.getBoundingClientRect();
      const pt: [number, number] = [(e.clientX - r.left - view.x) / view.s, -(e.clientY - r.top - view.y) / view.s];
      setMeasure(m => (m.length === 1 ? [m[0], pt] : [pt]));
    }
    downPos.current = null;
    pointers.current.delete(e.pointerId);
    pinchRef.current = null;
  };

  /** Export in any format. Colours come from the viewer, so recolouring a block carries into PES / JEF / VP3. */
  const exportAs = async (fmt: ExportFormat) => {
    const base = source.name.replace(/\.dst$/i, '');
    if (fmt === 'dst' && Object.keys(overrides).length === 0) { saveBlob(source.blob, `${safeFileName(base)}.dst`); return; }
    if (!dst) return;
    const rgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
    const flat: unknown[] = [];
    dst.blocks.forEach((b, i) => {
      const [r, g, bl] = rgb(colors[i]);
      const first = b.stitches[0];
      flat.push([first[0], first[1], 'JUMP', r, g, bl], [first[0], first[1], 'STOP', r, g, bl]);
      for (const [x, y, c] of b.stitches) flat.push([x, y, c === 0 ? 'STITCH' : 'JUMP', r, g, bl]);
    });
    try {
      saveBlob(await exportDesignBlob(flat, base, fmt), `${safeFileName(base)}.${fmt}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not export ${fmt.toUpperCase()}`);
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else rootRef.current?.requestFullscreen?.();
  };

  const zoomCenter = (f: number) => zoomAt(sizeRef.current.w / 2, sizeRef.current.h / 2, f);
  const toggleBlock = (i: number) =>
    setHidden(h => { const n = new Set(h); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  const st = dst?.stats;
  const tool = (active = false) =>
    `h-8 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`;
  const headBtn = 'h-9 px-3 inline-flex items-center justify-center rounded-lg text-sm font-semibold border border-gray-200 bg-surface text-gray-700 hover:bg-gray-100 transition-colors';

  return (
    <div className="@container w-full text-left">
      <div ref={rootRef} className={`bg-surface text-gray-900 w-full flex flex-col border border-gray-200 overflow-hidden ${fullscreen ? 'h-screen rounded-none border-0' : 'rounded-xl'}`}>

        {/* Header: title, view mode, file actions */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 sm:px-4 py-2.5 border-b border-gray-200 shrink-0">
          <div className="min-w-0 flex-1 basis-40">
            <h2 className="text-sm font-bold truncate">DST Preview <span className="font-normal text-gray-500">— {source.name}</span></h2>
            <p className="text-[11px] text-gray-500 truncate">Decoded from the actual .dst file</p>
          </div>
          <div role="tablist" aria-label="Preview mode" className="inline-flex p-0.5 rounded-lg bg-gray-100 border border-gray-200 max-w-full overflow-x-auto scrollbar-none">
            {MODES.filter(m => m.id !== 'compare' || canCompare).map(m => (
              <button key={m.id} role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)}
                      className={`px-3 h-8 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${mode === m.id ? 'bg-surface text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                <span className="@lg:hidden">{m.short}</span><span className="hidden @lg:inline">{m.label}</span>
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600" title={thread.notes}>
            <span className="hidden @lg:inline">Thread</span>
            <select value={thread.id} onChange={e => pickThread(e.target.value)} aria-label="Thread type"
                    className="h-9 rounded-lg border border-gray-200 bg-surface text-gray-700 text-xs font-semibold px-2 max-w-[9.5rem]">
              {THREAD_TYPES.map(t => <option key={t.id} value={t.id}>{t.name} {t.weight}</option>)}
            </select>
          </label>
          <label className={`${headBtn} cursor-pointer`} title="Open a .dst file">
            <span>📂<span className="hidden @lg:inline"> Open</span></span>
            <input type="file" accept=".dst" className="hidden"
                   onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
          </label>
          <ExportMenu onExport={exportAs} disabled={!dst} label="Download" compactLabel />
        </div>

        {/* Headline numbers */}
        {st && (
          <div className="grid grid-cols-3 @xl:grid-cols-5 gap-2 px-3 sm:px-4 pt-2.5 shrink-0">
            {[
              ['Stitches', st.stitches.toLocaleString()],
              ['Jumps', st.jumps],
              ['Trims', st.trims],
              ['Width', `${st.width_mm} mm`],
              ['Height', `${st.height_mm} mm`],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1.5 min-w-0">
                <div className="text-[10px] text-gray-500 font-medium">{k}</div>
                <div className="font-bold text-gray-900 text-sm truncate">{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Canvas: full-bleed, controls float on top */}
        <div className={`relative ${fullscreen ? 'flex-1 min-h-0' : ''} mt-2.5`}>
          <div ref={wrapRef}
               className={`${fullscreen ? 'h-full' : 'h-[62dvh] min-h-[360px] max-h-[720px]'} relative touch-none overflow-hidden ${overHandle ? 'cursor-col-resize' : measureOn ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
               onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={() => setCursor(null)}>
            <canvas ref={canvasRef} className="block" />
            {loading && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 bg-surface/60">Decoding DST…</div>}
            {error && <div className="absolute inset-x-4 top-8 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">{error}</div>}
            {mode === 'compare' && !origImg && <div className="absolute inset-x-0 top-10 text-center text-xs text-gray-500">Loading original…</div>}

            {/* playback scrubber, only while playing or scrubbing */}
            {(playing || progress < 1) && (
              <div className="absolute left-[34px] right-3 top-[30px] flex items-center gap-2 rounded-full bg-black/70 text-white pl-3 pr-4 py-1.5 backdrop-blur">
                <input type="range" min={0} max={1000} value={Math.round(progress * 1000)}
                       onChange={e => { setPlaying(false); setProgress(Number(e.target.value) / 1000); }}
                       onPointerDown={e => e.stopPropagation()}
                       className="flex-1 accent-indigo-400 h-1" aria-label="Stitch progress" />
                <span className="text-[11px] tabular-nums w-24 text-right">{Math.floor(total * progress).toLocaleString()} / {total.toLocaleString()}</span>
              </div>
            )}

            {/* size badge + cursor position */}
            <div className="absolute left-[34px] bottom-3 hidden @xl:flex items-center gap-2 pointer-events-none">
              {st && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-surface/90 border border-gray-200 backdrop-blur px-2.5 h-7 text-[11px] font-mono text-gray-600 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{st.width_mm} × {st.height_mm} mm
                </div>
              )}
              {cursor && mode !== 'compare' && (
                <div className="hidden @3xl:inline-flex items-center rounded-full bg-black/65 text-white px-2.5 h-7 text-[11px] font-mono">
                  x {cursor.x.toFixed(2)} · y {cursor.y.toFixed(2)}
                </div>
              )}
            </div>

            {/* floating tool pill */}
            <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-full bg-surface/90 border border-gray-200 backdrop-blur p-1 shadow-md" onPointerDown={e => e.stopPropagation()}>
              <button className={tool()} onClick={() => zoomCenter(1 / 1.4)} aria-label="Zoom out">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /></svg>
              </button>
              <button className={tool()} onClick={() => zoomCenter(1.4)} aria-label="Zoom in">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <span className="w-px h-5 bg-gray-200 mx-0.5" />
              <button className={tool()} onClick={fit} aria-label="Fit to view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                <span className="hidden @lg:inline">Fit</span>
              </button>
              <button className={tool(playing)} disabled={!dst} aria-label={playing ? 'Pause' : 'Play stitch-out'}
                      onClick={() => { if (progress >= 1) setProgress(0); setPlaying(p => !p); }}>
                {playing
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M7 5l12 7-12 7z" /></svg>}
                <span className="hidden @lg:inline">Play</span>
              </button>
              <button className={tool(measureOn)} aria-pressed={measureOn} aria-label="Measure distance"
                      onClick={() => { setMeasureOn(m => !m); setMeasure([]); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17L17 3l4 4L7 21z" /><path d="M7 13l2 2M10 10l2 2M13 7l2 2" /></svg>
                <span className="hidden @lg:inline">Measure</span>
              </button>
              <span className="w-px h-5 bg-gray-200 mx-0.5" />
              <button className={tool(fullscreen)} onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {fullscreen ? <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" /> : <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />}
                </svg>
              </button>
            </div>
          </div>
        </div>

        <AnalysisPanel analysis={source.analysis ?? dst?.analysis} />

        {/* Details drawer: colours, fabric, jumps, header. Closed by default to keep the canvas clean. */}
        {!fullscreen && (
          <div className="border-t border-gray-200 shrink-0 mt-2.5">
            <button onClick={() => setShowDetails(d => !d)} aria-expanded={showDetails}
                    className="w-full flex items-center justify-between px-3 sm:px-4 h-10 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <span>Details · colours, fabric, file info</span>
              <span aria-hidden>{showDetails ? '▴' : '▾'}</span>
            </button>
            {showDetails && (
              <div className="px-3 sm:px-4 pb-4 grid gap-4 @2xl:grid-cols-3 text-sm">
                <div className="space-y-3">
                  {st && (
                    <div className="grid grid-cols-2 gap-2">
                      {[['Colours', st.color_blocks], ['File size', `${(st.file_bytes / 1024).toFixed(1)} KB`], ['Avg stitch', `${st.avg_stitch_mm} mm`], ['Longest', `${st.max_stitch_mm} mm`]].map(([k, v]) => (
                        <div key={k as string} className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1.5">
                          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{k}</div>
                          <div className="font-bold text-gray-900 text-[13px]">{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <h3 className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-2">Fabric</h3>
                    <div className="flex gap-2 flex-wrap">
                      {FABRICS.map(f => (
                        <button key={f.name} onClick={() => setFabric(f.color)} title={f.name} aria-label={`${f.name} fabric`}
                                className={`w-8 h-8 rounded-full border-2 ${fabric === f.color ? 'border-indigo-500' : 'border-gray-300'}`} style={{ backgroundColor: f.color }} />
                      ))}
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={showJumps} onChange={e => setShowJumps(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
                      Show jumps &amp; trims (red dashed)
                    </label>
                  </div>
                </div>

                {dst && (
                  <div className="@2xl:col-span-1">
                    <h3 className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-2">Thread colours (sew order)</h3>
                    <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                      {dst.blocks.map((b, i) => (
                        <div key={i} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-opacity ${hidden.has(i) ? 'opacity-40' : ''} ${selBlock === i ? 'border-indigo-400' : 'border-gray-200'}`}>
                          <button onClick={() => setSelBlock(selBlock === i ? null : i)} aria-label={`Change colour of block ${i + 1}`} title="Change thread colour"
                                  className="w-5 h-5 rounded border border-black/20 shrink-0" style={{ backgroundColor: colors[i] }} />
                          <span className="flex-1 text-xs font-medium">Block {i + 1}</span>
                          <span className="text-[11px] text-gray-500 tabular-nums">{b.stitches.length.toLocaleString()}</span>
                          <button onClick={() => toggleBlock(i)} aria-label={hidden.has(i) ? `Show block ${i + 1}` : `Hide block ${i + 1}`}
                                  className="text-xs text-gray-500 hover:text-gray-800 w-6">{hidden.has(i) ? '🙈' : '👁'}</button>
                        </div>
                      ))}
                    </div>
                    {selBlock !== null && (
                      <div className="mt-2 rounded-lg border border-gray-200 p-2">
                        <div className="flex flex-wrap gap-1">
                          {THREAD_COLORS.map(c => (
                            <button key={c.hex} title={c.name} aria-label={c.name}
                                    onClick={() => setOverrides(o => ({ ...o, [selBlock]: c.hex }))}
                                    className={`w-5 h-5 rounded-full border ${colors[selBlock] === c.hex ? 'ring-2 ring-indigo-500' : 'border-black/20'}`} style={{ backgroundColor: c.hex }} />
                          ))}
                        </div>
                        <label className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                          Custom
                          <input type="color" value={colors[selBlock]} onChange={e => setOverrides(o => ({ ...o, [selBlock]: e.target.value }))} className="h-6 w-10 rounded border border-gray-300 bg-transparent" />
                          <button onClick={() => setOverrides(o => { const n = { ...o }; delete n[selBlock]; return n; })} className="ml-auto text-indigo-600 hover:underline">Reset</button>
                        </label>
                      </div>
                    )}
                    <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                      <div className="text-xs font-bold text-gray-800">{thread.name} · {thread.fiber} · {thread.weight}</div>
                      <p className="text-[11px] text-gray-500 mt-1">{thread.notes}</p>
                      <p className="text-[11px] text-gray-400 mt-1">Drawn {thread.widthMm} mm wide.</p>
                    </div>
                  </div>
                )}

                {dst && Object.keys(dst.header).length > 0 && (
                  <div>
                    <h3 className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-2">File header</h3>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs font-mono text-gray-600">
                      {Object.entries(dst.header).filter(([k]) => ['LA', 'ST', 'CO', '+X', '-X', '+Y', '-Y'].includes(k)).map(([k, v]) => (
                        <React.Fragment key={k}><dt className="text-gray-400">{k}</dt><dd>{v}</dd></React.Fragment>
                      ))}
                    </dl>
                    <p className="text-[11px] text-gray-400 mt-2">Header units are 0.1 mm. DST files store no thread colours; blocks use your design colours or a default palette.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
