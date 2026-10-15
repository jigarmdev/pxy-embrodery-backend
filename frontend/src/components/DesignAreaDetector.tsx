'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { detectDesignArea as apiDetect, DetectionResult, DesignArea } from '../lib/designAreaApi';

interface ScaleInfo {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  renderedW: number;
  renderedH: number;
}

interface SavedImage {
  name: string;
  url: string;
  size: number;
}

const CANVAS_W = 720;
const CANVAS_H = 540;

/** Canvas backdrop that follows the page theme. */
const canvasBg = () =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? '#f1f5f9' : '#0f172a';

export default function DesignAreaDetector() {
  const [file, setFile]                         = useState<File | null>(null);
  const [detectionResult, setDetectionResult]   = useState<DetectionResult | null>(null);
  const [isDetecting, setIsDetecting]           = useState(false);
  const [selectedArea, setSelectedArea]         = useState<DesignArea | null>(null);
  const [error, setError]                       = useState<string | null>(null);
  const [scaleInfo, setScaleInfo]               = useState<ScaleInfo | null>(null);
  const [copied, setCopied]                     = useState(false);
  const [savedImages, setSavedImages]           = useState<SavedImage[]>([]);
  const [activeThumb, setActiveThumb]           = useState<string | null>(null);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fabricRef    = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);

  /* ── Init Fabric canvas ── */
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;
    const fc = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_W, height: CANVAS_H,
      selection: true, backgroundColor: canvasBg(),
    });
    fabricRef.current = fc;
    fc.on('selection:created', onSelect);
    fc.on('selection:updated', onSelect);
    fc.on('selection:cleared', () => setSelectedArea(null));
    fc.on('object:modified', onObjectModified);
    return () => { fc.dispose(); fabricRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fit canvas to its container (CSS-only; internal 720x540 coordinates are unchanged) ── */
  useEffect(() => {
    const el = canvasHostRef.current;
    if (!el) return;
    const fit = () => {
      const fc = fabricRef.current;
      if (!fc) return;
      const w = Math.min(CANVAS_W, Math.max(240, el.clientWidth));
      fc.setDimensions({ width: `${w}px`, height: `${Math.round((w * CANVAS_H) / CANVAS_W)}px` }, { cssOnly: true });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Re-colour the canvas backdrop when the theme is toggled ── */
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const fc = fabricRef.current;
      if (fc) { fc.backgroundColor = canvasBg(); fc.renderAll(); }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  /* ── Load saved image gallery on mount ── */
  useEffect(() => { fetchSavedImages(); }, []);

  const fetchSavedImages = async () => {
    try {
      const res = await fetch('/api/product-images');
      if (res.ok) {
        const data = await res.json();
        setSavedImages(data.images ?? []);
      }
    } catch { /* non-critical */ }
  };

  /* ── Canvas selection handlers ── */
  function onSelect(e: any) {
    const obj = e.selected?.[0];
    if (obj?.data?.isArea) readAreaFromObject(obj);
  }
  function onObjectModified(e: any) {
    const obj = e.target;
    if (obj?.data?.isArea) readAreaFromObject(obj);
  }
  function readAreaFromObject(obj: fabric.Object) {
    if (!scaleInfo) return;
    const { scaleX, scaleY, offsetX, offsetY } = scaleInfo;
    setSelectedArea({
      x:      Math.round(((obj.left ?? 0) - offsetX) / scaleX),
      y:      Math.round(((obj.top  ?? 0) - offsetY) / scaleY),
      width:  Math.round((obj.width  ?? 0) * (obj.scaleX ?? 1) / scaleX),
      height: Math.round((obj.height ?? 0) * (obj.scaleY ?? 1) / scaleY),
      name:   (obj as any).data?.name,
    });
  }

  /* ── File pick ── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setDetectionResult(null);
    setSelectedArea(null);
    setError(null);
    loadImageOnCanvas(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f?.type.startsWith('image/')) return;
    setFile(f);
    setDetectionResult(null);
    setSelectedArea(null);
    setError(null);
    loadImageOnCanvas(URL.createObjectURL(f));
  };

  /* ── Load image onto Fabric canvas ── */
  const loadImageOnCanvas = useCallback((url: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      fc.clear();
      fc.backgroundColor = canvasBg();
      const iw = img.width || 1, ih = img.height || 1;
      const scale     = Math.min((CANVAS_W * 0.85) / iw, (CANVAS_H * 0.85) / ih);
      const renderedW = iw * scale, renderedH = ih * scale;
      const offsetX   = (CANVAS_W - renderedW) / 2;
      const offsetY   = (CANVAS_H - renderedH) / 2;
      img.set({ left: offsetX, top: offsetY, scaleX: scale, scaleY: scale,
                selectable: false, evented: false, originX: 'left', originY: 'top' });
      fc.add(img);
      fc.renderAll();
      setScaleInfo({ scaleX: scale, scaleY: scale, offsetX, offsetY, renderedW, renderedH });
    });
  }, []);

  /* ── Load a saved thumbnail back onto canvas ── */
  const loadSavedOnCanvas = (img: SavedImage) => {
    setActiveThumb(img.name);
    setDetectionResult(null);
    setSelectedArea(null);
    setError(null);
    loadImageOnCanvas(img.url);
  };

  const detectSavedImage = async (img: SavedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetecting(true);
    setError(null);
    try {
      // Fetch the image to create a File object for the API
      const res = await fetch(img.url);
      const blob = await res.blob();
      const newFile = new File([blob], img.name, { type: blob.type });
      setFile(newFile);
      
      // Load on canvas & set active
      loadImageOnCanvas(img.url);
      setActiveThumb(img.name);

      // Run detection
      const result = await apiDetect(newFile);
      setDetectionResult(result);
      drawAreas(result);
    } catch (err: any) {
      setError(err.message ?? 'Detection failed');
    } finally {
      setIsDetecting(false);
    }
  };

  /* ── Call backend detect (also saves image) ── */
  const runDetection = async () => {
    if (!file) return;
    setIsDetecting(true);
    setError(null);
    try {
      const result = await apiDetect(file);
      setDetectionResult(result);
      drawAreas(result);
      // Refresh gallery to include the newly saved image
      await fetchSavedImages();
      if (result.savedImageName) setActiveThumb(result.savedImageName);
    } catch (err: any) {
      setError(err.message ?? 'Detection failed');
    } finally {
      setIsDetecting(false);
    }
  };

  /* ── Draw detection boxes ── */
  const drawAreas = (result: DetectionResult) => {
    const fc = fabricRef.current;
    if (!fc || !scaleInfo) return;
    const { scaleX, scaleY, offsetX, offsetY } = scaleInfo;
    fc.getObjects().forEach(obj => { if ((obj as any).data?.isArea) fc.remove(obj); });

    const toC = (a: DesignArea) => ({
      left:   offsetX + a.x * scaleX,
      top:    offsetY + a.y * scaleY,
      width:  a.width  * scaleX,
      height: a.height * scaleY,
    });

    const addLabel = (text: string, area: DesignArea, color: string) => {
      fc.add(new fabric.Text(text, {
        left: toC(area).left + 4, top: toC(area).top + 4,
        fontSize: 10, fontFamily: 'sans-serif', fill: color,
        selectable: false, evented: false,
        data: { isArea: true, isLabel: true },
      }));
    };

    // Main area — red dashed
    fc.add(new fabric.Rect({
      ...toC(result.designArea),
      fill: 'rgba(255,68,68,0.08)', stroke: '#ef4444',
      strokeWidth: 2.5, strokeDashArray: [8, 5],
      cornerColor: '#ef4444', cornerSize: 8, transparentCorners: false,
      data: { isArea: true, name: 'Main Printable Area' },
    }));
    addLabel('Main Area', result.designArea, '#dc2626');

    // Alt areas — indigo dashed
    result.printableAreas.forEach((area, i) => {
      fc.add(new fabric.Rect({
        ...toC(area),
        fill: 'rgba(99,102,241,0.12)', stroke: '#6366f1',
        strokeWidth: 2, strokeDashArray: [5, 4],
        cornerColor: '#6366f1', cornerSize: 7, transparentCorners: false,
        data: { isArea: true, name: area.name ?? `Area ${i + 1}` },
      }));
      addLabel(area.name ?? `Area ${i + 1}`, area, '#4f46e5');
    });

    fc.renderAll();
  };

  /* ── Delete saved image ── */
  const deleteImage = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/product-images/${name}`, { method: 'DELETE' });
      setSavedImages(prev => prev.filter(i => i.name !== name));
      if (activeThumb === name) setActiveThumb(null);
    } catch { /* ignore */ }
  };

  /* ── Copy JSON ── */
  const handleCopy = () => {
    if (!selectedArea) return;
    navigator.clipboard.writeText(JSON.stringify(selectedArea, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Clear ── */
  const handleClear = () => {
    setFile(null); setDetectionResult(null);
    setSelectedArea(null); setError(null); setScaleInfo(null); setActiveThumb(null);
    const fc = fabricRef.current;
    if (fc) { fc.clear(); fc.backgroundColor = canvasBg(); fc.renderAll(); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasImage = !!file;

  return (
    <div className="themed bg-slate-100 flex-1">
      {/* Page header */}
      <div className="bg-surface border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="inline-block bg-indigo-100 text-indigo-700 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase mb-1">
          AI Detection
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
          Design Area <span className="text-indigo-600">Detector</span>
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Upload a garment image — the AI detects the best printable region
        </p>
      </div>

      <div className="max-w-[1400px] mx-auto p-3 sm:p-6">
        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6">

          {/* ────────── Left panel ────────── */}
          <div className="xl:w-72 flex-shrink-0 space-y-4">

            {/* Upload card */}
            <div className="bg-surface rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-3">Upload Garment</h3>

              <div
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all
                  ${hasImage ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              >
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                {hasImage ? (
                  <>
                    <div className="text-3xl mb-2">🖼️</div>
                    <p className="text-sm font-semibold text-indigo-700 truncate">{file!.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(file!.size / 1024).toFixed(0)} KB</p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl mb-2">📂</div>
                    <p className="text-sm text-gray-600 font-medium">Click or drag & drop</p>
                    <p className="text-xs text-gray-400 mt-1">PNG · JPG · WebP</p>
                  </>
                )}
              </div>

              {hasImage && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={runDetection}
                    disabled={isDetecting}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isDetecting
                      ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Detecting…</>
                      : '🔍 Detect Areas'}
                  </button>
                  <button onClick={handleClear} title="Clear"
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                    ✕
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">⚠ {error}</div>
              )}
            </div>

            {/* ── Saved image preview (shown right after detect) ── */}
            {detectionResult?.savedImageUrl && (
              <div className="bg-surface rounded-xl shadow-sm border border-indigo-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400">Saved Image</h3>
                  <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">✓ Saved</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detectionResult.savedImageUrl}
                    alt="Saved garment"
                    className="w-full object-contain max-h-48"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2 truncate font-mono">{detectionResult.savedImageName}</p>
                <p className="text-[10px] text-gray-400">
                  {detectionResult.imageSize.width} × {detectionResult.imageSize.height} px
                  · {detectionResult.garmentType}
                </p>
              </div>
            )}

            {/* ── Product image gallery ── */}
            {savedImages.length > 0 && (
              <div className="bg-surface rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400">Product Images</h3>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{savedImages.length}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {savedImages.map(img => (
                    <div
                      key={img.name}
                      onClick={() => loadSavedOnCanvas(img)}
                      className={`relative group rounded-lg overflow-hidden border-2 cursor-pointer transition-all
                        ${activeThumb === img.name ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-16 object-cover"
                      />
                      {/* Delete button */}
                      <button
                        onClick={(e) => deleteImage(img.name, e)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity leading-none"
                        title="Delete"
                      >×</button>
                      {/* Detect button */}
                      <button
                        onClick={(e) => detectSavedImage(img, e)}
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[9px] shadow flex items-center justify-center opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"
                        title="Detect Area"
                      >Detect</button>
                      {activeThumb === img.name && (
                        <div className="absolute inset-0 bg-indigo-600/10 flex items-start justify-start p-1 pointer-events-none">
                          <span className="text-[9px] text-indigo-700 font-bold bg-surface/80 px-1 rounded">Active</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Click a thumbnail to load it on the canvas</p>
              </div>
            )}

            {/* Detection summary */}
            {detectionResult && (
              <div className="bg-surface rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
                <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400">Detection Summary</h3>
                <div className="space-y-2">
                  <Row label="Garment"    value={detectionResult.garmentType} />
                  <Row label="Image size" value={`${detectionResult.imageSize.width} × ${detectionResult.imageSize.height} px`} />
                  <Row label="Main area"  value={`${detectionResult.designArea.width} × ${detectionResult.designArea.height} px`} />
                  <Row label="Alt areas"  value={String(detectionResult.printableAreas.length)} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-2">All Printable Areas</p>
                  <div className="space-y-1.5">
                    {[{ ...detectionResult.designArea, name: 'Main Area' }, ...detectionResult.printableAreas].map((a, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs">
                        <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${i === 0 ? 'bg-red-400' : 'bg-indigo-400'}`} />
                        <span className="font-medium truncate">{a.name ?? `Area ${i}`}</span>
                        <span className="ml-auto text-gray-400 font-mono">{a.width}×{a.height}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Selected area coords */}
            {selectedArea && (
              <div className="bg-surface rounded-xl shadow-sm border border-indigo-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400">Selected Area</h3>
                  <button onClick={handleCopy}
                    className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors font-medium">
                    {copied ? '✓ Copied' : 'Copy JSON'}
                  </button>
                </div>
                <div className="space-y-2">
                  <CoordRow label="Name"   value={selectedArea.name ?? '—'} />
                  <CoordRow label="X"      value={`${selectedArea.x} px`} />
                  <CoordRow label="Y"      value={`${selectedArea.y} px`} />
                  <CoordRow label="Width"  value={`${selectedArea.width} px`} />
                  <CoordRow label="Height" value={`${selectedArea.height} px`} />
                </div>
                <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                  <pre className="text-[10px] text-gray-500 overflow-x-auto">
{JSON.stringify({ x: selectedArea.x, y: selectedArea.y, width: selectedArea.width, height: selectedArea.height }, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="bg-surface rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-3">Legend</h3>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-8 border-t-2 border-dashed border-red-400" />
                  <span>Main printable area</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 border-t-2 border-dashed border-indigo-400" />
                  <span>Alternative area</span>
                </div>
                <p className="text-gray-400 pt-1">Click any box to inspect coords. Drag handles to resize.</p>
              </div>
            </div>
          </div>

          {/* ────────── Canvas panel ────────── */}
          <div className="flex-1 min-w-0">
            <div className="bg-surface rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">Canvas Preview</h3>
                {scaleInfo && detectionResult && (
                  <span className="text-xs text-gray-400">
                    Original: {detectionResult.imageSize.width} × {detectionResult.imageSize.height} px
                    · Rendered: {Math.round(scaleInfo.renderedW)} × {Math.round(scaleInfo.renderedH)} px
                  </span>
                )}
              </div>

              <div className="relative flex items-center justify-center p-2 sm:p-4 bg-slate-50 min-h-[300px] sm:min-h-[572px]">
                {/* 
                  Wrap the canvas in its own container so Fabric.js can safely manipulate the DOM 
                  without interfering with React's sibling elements.
                */}
                <div ref={canvasHostRef} className="w-full flex justify-center">
                  <canvas ref={canvasRef} className="rounded-lg shadow-sm" />
                </div>
                
                {/* The empty state overlay is absolutely positioned so it sits on top */}
                {!hasImage && !activeThumb && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 pointer-events-none select-none">
                    <span className="text-6xl mb-3">👕</span>
                    <span className="text-sm">Upload a garment image to begin</span>
                  </div>
                )}
              </div>

              {detectionResult && (
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                  Click a detection box to inspect its coordinates · Drag corner handles to refine the area
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-gray-700">{value}</span>
    </div>
  );
}

function CoordRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-1.5 text-xs">
      <span className="text-gray-400 uppercase tracking-wide font-medium">{label}</span>
      <span className="font-bold text-indigo-700 font-mono">{value}</span>
    </div>
  );
}

