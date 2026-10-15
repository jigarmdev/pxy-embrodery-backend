// @ts-nocheck
'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Type, ImagePlus, Trash2, ArrowUp, ArrowDown, Brush, Eye, Undo2, Redo2,
  Shapes, FileUp, Crosshair, Layers, Sparkles,
} from 'lucide-react';
import {
  ensureArtwork, ensureGroupArtwork, getArtwork, removeArtwork, setArtworkBase, GROUP_AXES,
  getUvSegments, loadFabricImage, IText, setArtworkMaterial, getArtworkMaterial,
  exportArtworkPNG, exportArtworkSVG, commitArtwork, undoArtwork, redoArtwork, canUndo, canRedo,
  subscribeArtwork, svgToFabric, recolor,
} from '../lib/artwork';
import { CLIPART, svgDataUrl, sanitizeSvg } from '../lib/clipart';
import { updateDecal } from '../lib/decal';

const FONTS = ['Arial', 'Georgia', 'Impact', 'Courier New', 'Trebuchet MS', 'Times New Roman'];
const VIEW = 300; // max CSS size of the 2D editor
const GROUP = '__group__';

// Per-mesh / per-group / per-decal artwork editor: a Fabric canvas whose output is a CanvasTexture.
export default function ArtworkPanel({
  activeObject, onMessage, materials = [], placingDecal, onPlaceDecal, onCancelPlace, onDeleteDecal,
}) {
  const [meshes, setMeshes] = useState([]);
  const [targetId, setTargetId] = useState(null);
  const [mountKey, setMountKey] = useState(0);   // bump when an entry is created / removed
  const [, setTick] = useState(0);               // re-render on history / decal changes
  const [sel, setSel] = useState(null);          // selected fabric object props
  const [showUv, setShowUv] = useState(true);
  const [showClip, setShowClip] = useState(false);
  const [axis, setAxis] = useState('front');
  const [hasEmbroideryPatch, setHasEmbroideryPatch] = useState(false);
  const hostRef = useRef(null);
  const uvRef = useRef(null);

  useEffect(() => subscribeArtwork(() => setTick(t => t + 1)), []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('latest_embroidery_patch');
      if (raw) setHasEmbroideryPatch(true);
    } catch (_) {}
  }, []);


  // Everything the selected object can target
  useEffect(() => {
    const list = [];
    if (activeObject) {
      if (activeObject.isMesh) list.push(activeObject);
      else activeObject.traverse?.(c => { if (c.isMesh) list.push(c); });
    }
    const design = list.filter(m => !m.userData?.isDecal);
    let next = list[0]?.uuid ?? null;
    if (activeObject?.userData?.isDecal) next = activeObject.uuid;
    else if (!activeObject?.isMesh && design.length > 1) {
      const e0 = getArtwork(design[0]);
      const mixed = design.some(m => { const e = getArtwork(m); return e && e.kind !== 'group'; });
      next = e0?.kind === 'group' || !mixed ? GROUP : design.find(m => getArtwork(m))?.uuid ?? GROUP;
    }
    setMeshes(list);
    setTargetId(next);
  }, [activeObject]);

  const designMeshes = meshes.filter(m => !m.userData?.isDecal);
  const canGroup = !!activeObject && !activeObject.isMesh && designMeshes.length > 1;
  const isGroupMode = targetId === GROUP && canGroup;
  const target = isGroupMode ? designMeshes[0] : (meshes.find(m => m.uuid === targetId) || null);
  const entry = getArtwork(target);
  const decal = target?.userData?.isDecal ? target.userData.decal : null;

  const dims = entry
    ? { w: Math.round(entry.w * Math.min(1, VIEW / Math.max(entry.w, entry.h))), h: Math.round(entry.h * Math.min(1, VIEW / Math.max(entry.w, entry.h))) }
    : { w: VIEW, h: VIEW };

  const syncSel = useCallback((canvas) => {
    const o = canvas.getActiveObject();
    if (!o) { setSel(null); return; }
    const isText = o.type === 'i-text' || o.type === 'text';
    const first = o.getObjects ? o.getObjects().find(c => typeof c.fill === 'string') : o;
    setSel({
      isText,
      isImage: o.type === 'image',
      fill: typeof (first?.fill) === 'string' && /^#[0-9a-f]{6}$/i.test(first.fill) ? first.fill : '#000000',
      fontSize: o.fontSize,
      fontFamily: o.fontFamily,
    });
  }, []);

  // Mount the entry's Fabric canvas into the panel
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    host.innerHTML = '';
    const e = getArtwork(target);
    if (!e) { setSel(null); return undefined; }
    const { canvas } = e;
    canvas.setDimensions({ width: `${dims.w}px`, height: `${dims.h}px` }, { cssOnly: true });
    host.appendChild(canvas.wrapperEl);
    const on = () => syncSel(canvas);
    canvas.on('selection:created', on);
    canvas.on('selection:updated', on);
    canvas.on('selection:cleared', on);
    syncSel(canvas);
    return () => {
      // The canvas may already be disposed (artwork removed / scene replaced)
      try {
        canvas.off('selection:created', on);
        canvas.off('selection:updated', on);
        canvas.off('selection:cleared', on);
      } catch (err) { /* disposed */ }
      if (canvas.wrapperEl && canvas.wrapperEl.parentNode === host) host.removeChild(canvas.wrapperEl);
      else host.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, mountKey, syncSel]);

  // UV guide overlay
  useEffect(() => {
    const c = uvRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (!entry || !showUv || decal) return;
    const flip = entry.texture.flipY; // flipY: v=1 is the top of the canvas
    ctx.strokeStyle = 'rgba(0,200,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    entry.targets.forEach(({ mesh }) => {
      const segs = getUvSegments(mesh);
      if (!segs) return;
      segs.forEach(([u1, v1, u2, v2]) => {
        ctx.moveTo(u1 * c.width, (flip ? 1 - v1 : v1) * c.height);
        ctx.lineTo(u2 * c.width, (flip ? 1 - v2 : v2) * c.height);
      });
    });
    ctx.stroke();
  }, [entry, showUv, decal, mountKey]);

  const withCanvas = (fn) => { const e = getArtwork(target); if (e) return fn(e.canvas); };

  const enableMesh = () => {
    if (!target) return;
    if (!target.geometry?.attributes?.uv) { onMessage?.('This mesh has no UV map, so artwork cannot be applied.'); return; }
    ensureArtwork(window.THREE, target);
    setMountKey(k => k + 1);
  };

  const enableGroup = () => {
    if (designMeshes.some(m => getArtwork(m))) {
      onMessage?.('Some meshes in this group already have their own artwork. Remove it first.');
      return;
    }
    ensureGroupArtwork(window.THREE, designMeshes, axis);
    setMountKey(k => k + 1);
  };

  // Centre and fit a new layer on the canvas
  const place = (canvas, o, frac) => {
    const w = canvas.getWidth(), h = canvas.getHeight();
    const s = (Math.min(w, h) * frac) / Math.max(o.width, o.height, 1);
    o.set({ left: w / 2, top: h / 2, originX: 'center', originY: 'center', scaleX: s, scaleY: s });
    canvas.add(o); canvas.setActiveObject(o); canvas.requestRenderAll();
  };

  const addText = () => withCanvas(canvas => {
    const t = new IText('Your Text', {
      left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: 'center', originY: 'center',
      fontSize: Math.round(Math.min(canvas.getWidth(), canvas.getHeight()) * 0.12), fill: '#111111', fontFamily: 'Arial',
    });
    canvas.add(t); canvas.setActiveObject(t); canvas.requestRenderAll();
  });

  const addImage = (file) => withCanvas(async (canvas) => {
    if (!file) return;
    try {
      // data URL (not a blob URL) so the layer survives save / reload
      const url = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      place(canvas, await loadFabricImage(url), 0.5);
    } catch (e) {
      onMessage?.('Could not load image');
    }
  });

  const addSvgString = (svg) => withCanvas(async (canvas) => {
    try {
      place(canvas, await svgToFabric(sanitizeSvg(svg)), 0.4);
    } catch (e) {
      onMessage?.(e.message || 'Could not load SVG');
    }
  });

  const uploadSvg = async (file) => {
    if (!file) return;
    if (!/svg/i.test(file.type) && !/\.svg$/i.test(file.name)) { onMessage?.('Please choose an .svg file'); return; }
    addSvgString(await file.text());
  };

  const addEmbroideryPatch = () => withCanvas(async (canvas) => {
    try {
      const raw = localStorage.getItem('latest_embroidery_patch');
      if (!raw) {
        onMessage?.('No saved embroidery design found. Visit the Embroidery Simulator to digitize your logo first!');
        return;
      }
      const data = JSON.parse(raw);
      if (!data?.dataUrl) {
        onMessage?.('Invalid embroidery patch data.');
        return;
      }
      const img = await loadFabricImage(data.dataUrl);
      place(canvas, img, 0.6);
      onMessage?.(`Applied embroidery patch: ${data.title || 'Embroidery Design'}`);
    } catch (e) {
      onMessage?.('Could not apply embroidery patch');
    }
  });


  const updateSel = (props) => withCanvas(canvas => {
    const o = canvas.getActiveObject();
    if (!o) return;
    o.set(props); canvas.requestRenderAll(); syncSel(canvas); commitArtwork(target);
  });

  const recolorSel = (color) => withCanvas(canvas => {
    const o = canvas.getActiveObject();
    if (!o) return;
    recolor(o, color); o.dirty = true; canvas.requestRenderAll(); syncSel(canvas); commitArtwork(target);
  });

  const deleteSel = () => withCanvas(canvas => {
    canvas.getActiveObjects().forEach(o => canvas.remove(o));
    canvas.discardActiveObject(); canvas.requestRenderAll();
  });

  const reorder = (dir) => withCanvas(canvas => {
    const o = canvas.getActiveObject();
    if (!o) return;
    dir > 0 ? canvas.bringObjectForward(o) : canvas.sendObjectBackwards(o);
    canvas.requestRenderAll(); commitArtwork(target);
  });

  const pickMaterial = async (img, tiles) => {
    try {
      await setArtworkMaterial(target, `/materils/${img}`, tiles);
      setTick(t => t + 1);
    } catch (e) {
      onMessage?.('Could not load material image');
    }
  };

  const download = (kind) => {
    const name = `${(target.name || 'mesh').replace(/[^\w-]+/g, '_')}-design`;
    const a = document.createElement('a');
    if (kind === 'png') {
      a.href = exportArtworkPNG(target);
      a.download = `${name}.png`;
    } else {
      a.href = URL.createObjectURL(new Blob([exportArtworkSVG(target)], { type: 'image/svg+xml' }));
      a.download = `${name}.svg`;
    }
    a.click();
  };

  const remove = () => { removeArtwork(target); setMountKey(k => k + 1); };

  const changeDecal = (patch) => {
    updateDecal(window.THREE, target, patch);
    setTick(t => t + 1);
  };

  const material = getArtworkMaterial(target);
  const bg = entry?.canvas.backgroundColor;
  const baseColor = typeof bg === 'string' && /^#[0-9a-f]{6}$/i.test(bg) ? bg : '#ffffff';

  const btn = 'px-2 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 rounded border border-slate-700 text-[11px] flex items-center justify-center gap-1';

  if (!activeObject) return null;

  return (
    <div className="space-y-3 pt-3 border-t border-slate-800">
      <div className="flex items-center space-x-1 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
        <Brush className="w-3.5 h-3.5 text-cyan-400" />
        <span>Artwork & Decals</span>
      </div>

      {/* Decal tool */}
      {placingDecal ? (
        <button onClick={onCancelPlace} className={`${btn} w-full text-amber-300 border-amber-500/60`}>
          <Crosshair className="w-3.5 h-3.5" /> Click the model to place… (Esc to cancel)
        </button>
      ) : (
        <button onClick={onPlaceDecal} className={`${btn} w-full`}>
          <Crosshair className="w-3.5 h-3.5" /> Add decal (click on model surface)
        </button>
      )}

      {meshes.length > 0 && (meshes.length > 1 || canGroup) && (
        <select
          value={isGroupMode ? GROUP : (targetId ?? '')}
          onChange={(e) => setTargetId(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
        >
          {canGroup && <option value={GROUP}>Whole group (one shared design)</option>}
          {meshes.map(m => (
            <option key={m.uuid} value={m.uuid}>
              {m.userData?.isDecal ? 'Decal: ' : ''}{m.name || m.uuid.slice(0, 6)}
            </option>
          ))}
        </select>
      )}

      {target && !entry && (
        isGroupMode ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <Layers className="w-3 h-3" /> Projection
              <select value={axis} onChange={(e) => setAxis(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[11px] text-slate-200">
                {GROUP_AXES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
            <button onClick={enableGroup} className={`${btn} w-full`}>
              <Brush className="w-3.5 h-3.5" /> Create one design across {designMeshes.length} parts
            </button>
          </div>
        ) : (
          <button onClick={enableMesh} className={`${btn} w-full`}>
            <Brush className="w-3.5 h-3.5" /> Add artwork to “{target.name || 'mesh'}”
          </button>
        )
      )}

      {entry && (
        <>
          {entry.kind === 'group' && (
            <div className="text-[10px] text-cyan-300/80">
              Group design · {entry.targets.length} parts · projected from the {entry.axis}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button onClick={addText} className={btn}><Type className="w-3.5 h-3.5" /> Text</button>
            <label className={`${btn} cursor-pointer`}>
              <ImagePlus className="w-3.5 h-3.5" /> Image
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <button onClick={() => setShowClip(v => !v)} className={`${btn} ${showClip ? 'border-cyan-500/60' : ''}`}>
              <Shapes className="w-3.5 h-3.5" /> Clip-art
            </button>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={addEmbroideryPatch}
              className={`${btn} w-full flex items-center justify-center gap-1.5 py-1.5 ${hasEmbroideryPatch ? 'text-amber-300 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 shadow-sm' : 'text-slate-400 border-slate-700/60 hover:bg-slate-800'}`}
              title="Apply embroidery patch created in the Embroidery Simulator"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{hasEmbroideryPatch ? '🧵 Apply Stitched Patch' : '🧵 Embroidery Patch (from Studio)'}</span>
            </button>
          </div>

          {showClip && (
            <div className="space-y-2 p-2 bg-slate-900 border border-slate-800 rounded">
              <div className="grid grid-cols-6 gap-1">
                {CLIPART.map(c => (
                  <button key={c.id} title={c.name} onClick={() => addSvgString(c.svg)}
                    className="aspect-square bg-slate-200 hover:bg-white rounded p-0.5">
                    <img src={svgDataUrl(c.svg)} alt={c.name} className="w-full h-full" />
                  </button>
                ))}
              </div>
              <label className={`${btn} cursor-pointer`}>
                <FileUp className="w-3.5 h-3.5" /> Upload SVG
                <input type="file" accept=".svg,image/svg+xml" className="hidden"
                  onChange={(e) => { uploadSvg(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              <div className="text-[9px] text-slate-500">Uploaded SVGs are cleaned: scripts and external links are removed.</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => undoArtwork(target)} disabled={!canUndo(target)} className={btn}><Undo2 className="w-3.5 h-3.5" /> Undo</button>
            <button onClick={() => redoArtwork(target)} disabled={!canRedo(target)} className={btn}><Redo2 className="w-3.5 h-3.5" /> Redo</button>
          </div>

          {!decal && materials.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold">Body material (under artwork)</span>
                {material && (
                  <label className="flex items-center gap-1.5">
                    Tiles
                    <input type="range" min={1} max={10} step={1} value={material.tiles}
                      onChange={(e) => pickMaterial(material.url.split('/').pop(), +e.target.value)} />
                    <span className="w-3 text-right">{material.tiles}</span>
                  </label>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1 max-h-28 overflow-y-auto p-0.5">
                {materials.map(img => {
                  const on = material?.url === `/materils/${img}`;
                  return (
                    <img key={img} src={`/materils/${img}`} alt={img} title={img.split('.')[0]}
                      onClick={() => pickMaterial(img, material?.tiles ?? 3)}
                      className={`aspect-square object-cover rounded cursor-pointer border ${on ? 'border-amber-400' : 'border-slate-800 hover:border-amber-500'}`} />
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <label className="flex items-center gap-1.5">
              {decal ? 'Background' : 'Flat colour'}
              <input type="color" value={baseColor}
                onChange={(e) => setArtworkBase(target, e.target.value)}
                className="w-6 h-5 bg-transparent border-0 p-0 cursor-pointer" />
              {decal && (
                <button onClick={() => setArtworkBase(target, '')} className="underline text-slate-400 hover:text-slate-200">clear</button>
              )}
            </label>
            {!decal && (
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showUv} onChange={(e) => setShowUv(e.target.checked)} />
                <Eye className="w-3 h-3" /> UV guide
              </label>
            )}
          </div>
        </>
      )}

      {/* Editor host stays mounted so the ref is always available */}
      <div className={entry ? 'flex justify-center' : 'hidden'}>
        <div className="relative border border-slate-700"
          style={{
            width: dims.w, height: dims.h,
            backgroundColor: '#0b0e14',
            backgroundImage: decal ? 'linear-gradient(45deg,#1e293b 25%,transparent 25%,transparent 75%,#1e293b 75%),linear-gradient(45deg,#1e293b 25%,transparent 25%,transparent 75%,#1e293b 75%)' : undefined,
            backgroundSize: '16px 16px', backgroundPosition: '0 0, 8px 8px',
          }}>
          <div ref={hostRef} />
          <canvas ref={uvRef} width={entry?.w || 1} height={entry?.h || 1}
            className="absolute inset-0 pointer-events-none" style={{ width: dims.w, height: dims.h }} />
        </div>
      </div>

      {entry && sel && (
        <div className="space-y-2 p-2 bg-slate-900 border border-slate-800 rounded">
          {sel.isText && (
            <div className="grid grid-cols-3 gap-2">
              <select value={sel.fontFamily} onChange={(e) => updateSel({ fontFamily: e.target.value })}
                className="col-span-2 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[11px] text-slate-200">
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <input type="number" min={8} max={600} value={Math.round(sel.fontSize)}
                onChange={(e) => updateSel({ fontSize: +e.target.value || 8 })}
                className="bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[11px] text-slate-200" />
            </div>
          )}
          <div className="flex items-center justify-between">
            {!sel.isImage && (
              <input type="color" value={sel.fill}
                onChange={(e) => (sel.isText ? updateSel({ fill: e.target.value }) : recolorSel(e.target.value))}
                className="w-6 h-5 bg-transparent border-0 p-0 cursor-pointer" title="Layer colour" />
            )}
            <div className="flex gap-1 ml-auto">
              <button onClick={() => reorder(1)} className={btn} title="Bring forward"><ArrowUp className="w-3 h-3" /></button>
              <button onClick={() => reorder(-1)} className={btn} title="Send backward"><ArrowDown className="w-3 h-3" /></button>
              <button onClick={deleteSel} className={`${btn} text-red-400`} title="Delete layer"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      )}

      {decal && (
        <div className="space-y-2 p-2 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-400">
          <div className="text-slate-300 font-semibold">Decal placement</div>
          <div className="text-slate-500">Drag the selected decal on the model to move it.</div>
          <label className="flex items-center gap-2">
            <span className="w-12">Size</span>
            <input type="range" min={0.02} max={1} step={0.01} value={decal.size} className="flex-1"
              onChange={(e) => changeDecal({ size: +e.target.value })} />
            <span className="w-8 text-right font-mono">{decal.size.toFixed(2)}</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-12">Rotate</span>
            <input type="range" min={-180} max={180} step={1} value={Math.round(((decal.angle || 0) * 180) / Math.PI)} className="flex-1"
              onChange={(e) => changeDecal({ angle: (+e.target.value * Math.PI) / 180 })} />
            <span className="w-8 text-right font-mono">{Math.round(((decal.angle || 0) * 180) / Math.PI)}°</span>
          </label>
          <button onClick={() => onDeleteDecal?.(target)} className={`${btn} w-full text-red-300`}>
            <Trash2 className="w-3.5 h-3.5" /> Delete decal
          </button>
        </div>
      )}

      {entry && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => download('png')} className={btn}>Export PNG</button>
          <button onClick={() => download('svg')} className={btn}>Export SVG</button>
        </div>
      )}

      {entry && !decal && (
        <button onClick={remove} className={`${btn} w-full text-red-300`}>
          <Trash2 className="w-3.5 h-3.5" /> Remove artwork{entry.kind === 'group' ? ' from the whole group' : ' from this mesh'}
        </button>
      )}
    </div>
  );
}
