'use client';

import React, { useState, useEffect, useRef } from 'react';
import DstPreview, { DstSource } from './DstPreview';
import { CATS, STITCHES, FABRICS, extractPalette, calcMetrics, buildResult, drawStitch, drawZoom, drawChart, drawOutline, generateDSTPoints } from '../lib/simulator';
import { digitizeShape, downloadDesign, exportDstBlob, fetchMethodPreviews, MethodPreview, ExportFormat } from '../lib/api';
import ExportMenu from './ExportMenu';
import CropModal from './CropModal';
import { prepareUpload, ACCEPT } from '../lib/imagePrep';
import DesignSettingsPanel from './DesignSettingsPanel';
import DesignLibrary from './DesignLibrary';
import { StitchSwatch, StitchPreviewPanel } from './StitchPreview';
import { DEFAULT_SETTINGS, DesignSettings, toDigitizeOptions, settingsKey, hoopSize, fabricProfile } from '../lib/designSettings';
import { THREAD_TYPES, DEFAULT_THREAD } from '../lib/threads';

interface Props {
  file: File | null;
  setFile: (f: File | null) => void;
}

function Section({ title, summary, open = false, children }: { title: string; summary?: string; open?: boolean; children: React.ReactNode }) {
return (
  <details open={open} className="ws-section group bg-surface rounded-xl border border-gray-100 shadow-sm">
    <summary className="flex items-center gap-2 px-4 h-12 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
      <span className="text-xs font-bold tracking-widest uppercase text-gray-500">{title}</span>
      {summary && <span className="ml-auto min-w-0 truncate text-xs font-semibold text-indigo-600">{summary}</span>}
      <span aria-hidden className={`${summary ? '' : 'ml-auto'} text-gray-400 text-xs transition-transform group-open:rotate-180`}>▾</span>
    </summary>
    <div className="ws-body px-4 pb-4">{children}</div>
  </details>
)
}

export default function AdvancedSimulator({ file, setFile }: Props) {
  const [activeCat, setActiveCat] = useState('fill');
  const [selStitch, setSelStitch] = useState<any>(STITCHES[0]);
  const [selFabric, setSelFabric] = useState<any>(FABRICS[0]);
  const [budget, setBudget] = useState(3000);
  const [activeTab, setActiveTab] = useState('main');
  const [imgData, setImgData] = useState<ImageData | null>(null);
  const [palette, setPalette] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [rendering, setRendering] = useState(false);
  const [dstSource, setDstSource] = useState<DstSource | null>(null);
  const [dstBusy, setDstBusy] = useState(false);
  const [dstError, setDstError] = useState<string | null>(null);
  const dstKey = useRef('');
  const [settings, setSettings] = useState<DesignSettings>(DEFAULT_SETTINGS);
  const patchSettings = (p: Partial<DesignSettings>) => setSettings(s => ({ ...s, ...p }));
  const [threadId, setThreadId] = useState(DEFAULT_THREAD.id);
  const thread = THREAD_TYPES.find(t => t.id === threadId) ?? DEFAULT_THREAD;
  const [previews, setPreviews] = useState<Record<string, MethodPreview>>({});
  const [cropping, setCropping] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // every incoming image (upload, sample design, crop) goes through the same preparation: SVG, size limits
  const acceptFile = async (f: File | null | undefined) => {
    if (!f) return;
    try { setFile(await prepareUpload(f)); setUploadError(null); }
    catch (e) { setUploadError(e instanceof Error ? e.message : 'Could not use this image'); }
  };

  const cvsWork = useRef<HTMLCanvasElement>(null);
  const cvsMain = useRef<HTMLCanvasElement>(null);
  const cvsZoom = useRef<HTMLCanvasElement>(null);
  const cvsChart = useRef<HTMLCanvasElement>(null);
  const cvsOutline = useRef<HTMLCanvasElement>(null);
  const cvsOrig = useRef<HTMLCanvasElement>(null);
  const cvsOrigSide = useRef<HTMLCanvasElement>(null); // side-panel copy (a ref can only point at one element)

  useEffect(() => {
    if (!file) {
      setImgData(null);
      setResult(null);
      return;
    }
    const r = new FileReader();
    r.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        if (cvsWork.current && cvsOrig.current) {
          const MAX = 180;
          const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
          const sw = Math.round(img.naturalWidth * scale);
          const sh = Math.round(img.naturalHeight * scale);
          
          cvsWork.current.width = sw;
          cvsWork.current.height = sh;
          const ctx = cvsWork.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, sw, sh);
            const id = ctx.getImageData(0, 0, sw, sh);
            const pal = extractPalette(id.data, 10);
            
            // Draw original
            cvsOrig.current.width = sw;
            cvsOrig.current.height = sh;
            const ctxO = cvsOrig.current.getContext('2d');
            if (ctxO) {
              ctxO.drawImage(img, 0, 0, sw, sh);
              fitCanvas(cvsOrig.current, sw, sh);
              if (cvsOrigSide.current) {
                cvsOrigSide.current.width = sw;
                cvsOrigSide.current.height = sh;
                cvsOrigSide.current.getContext('2d')?.drawImage(img, 0, 0, sw, sh);
                fitCanvas(cvsOrigSide.current, sw, sh);
              }
            }

            setPalette(pal);
            setImgData(id);
          }
        }
      };
      img.src = dataUrl;
    };
    r.readAsDataURL(file);
  }, [file]);

  useEffect(() => {
    if (!imgData) return;
    setRendering(true);
    const timer = setTimeout(() => {
      try {
        if (cvsMain.current) drawStitch(imgData, selStitch, selFabric, cvsMain.current);
        if (cvsZoom.current) drawZoom(imgData, selStitch, selFabric, cvsZoom.current);
        if (cvsChart.current) drawChart(imgData, palette, cvsChart.current);
        if (cvsOutline.current) drawOutline(imgData, cvsOutline.current);

        const metrics = calcMetrics(imgData);
        const res = buildResult(metrics, palette, imgData.width * 5, imgData.height * 5, budget, selStitch, selFabric);
        setResult(res);
      } catch (err) {
        console.error(err);
      } finally {
        setRendering(false);
      }
    }, 100); // small delay to allow UI to show spinner
    return () => clearTimeout(timer);
  }, [imgData, selStitch, selFabric, budget]); // omit palette to avoid extra renders since it changes with imgData

  function fitCanvas(cvs: HTMLCanvasElement, W: number, H: number) {
    const t = 380, ds = Math.min(1, t / Math.max(W, H));
    cvs.style.width = Math.round(W * ds) + 'px';
    cvs.style.height = 'auto'; // keeps aspect ratio when max-w-full shrinks the canvas on small screens
  }

  const handleDownloadPNG = () => {
    if (cvsMain.current && cvsMain.current.width > 0) {
      const a = document.createElement('a');
      a.href = cvsMain.current.toDataURL();
      a.download = 'embroidery_preview.png';
      a.click();
    }
  };

  // Real-life stitch previews: the backend's own generators on a sample shape, refreshed when the settings that affect them change
  const previewKey = [settings.underlay, settings.pullComp, settings.density, settings.angle, settings.stitchLen].join('|');
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchMethodPreviews({
        underlay: settings.underlay, pullComp: settings.pullComp ?? undefined, density: settings.density ?? undefined,
        angle: settings.angle ?? undefined, stitchLen: settings.stitchLen ?? undefined,
      }).then(m => { if (!cancelled) setPreviews(m); }).catch(() => { /* backend offline: cards fall back to their icons */ });
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  // The DST Preview tab shows the real .dst bytes (decoded by the backend), rebuilt when the design inputs change
  const dstInputKey = file ? `${file.name}:${file.size}:${selStitch.id}:${selFabric.id}:${settingsKey(settings)}` : '';
  useEffect(() => {
    if (!file || !imgData) return;
    if (dstKey.current === dstInputKey) return;
    let cancelled = false;
    const timer = setTimeout(async () => { // debounce: typing in a number box shouldn't fire a request per keystroke
      setDstBusy(true); setDstError(null);
      try {
        const digitized = await digitizeShape(selStitch.id, selFabric.id, file, toDigitizeOptions(settings));
        if (!digitized.stitches?.length) throw new Error('No stitches generated by backend.');
        const name = settings.name.trim() || 'embroidery_pxy888';
        const blob = await exportDstBlob(digitized.stitches, name);
        // A DST file stores no thread colours; take them from the design (one per colour block, in sew order)
        const colors = digitized.palette.map(p => p.hex);
        if (cancelled) return;
        dstKey.current = dstInputKey;
        const hoop = hoopSize(settings);
        setDstSource({ blob, name: `${name}.dst`, colors, original: file, placement: digitized.placement, hoop, analysis: digitized.analysis, fabric: selFabric.id });
      } catch (err) {
        if (!cancelled) setDstError(err instanceof Error ? err.message : 'Failed to build the DST preview.');
      } finally {
        if (!cancelled) setDstBusy(false);
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, imgData, dstInputKey]);

  const handleExport = async (fmt: ExportFormat) => {
    if (!file || !imgData) return;
    try {
      setRendering(true);
      // Real vector tracing and colour segmentation happen on the backend (Shapely + pyembroidery)
      const result = await digitizeShape(selStitch.id, selFabric.id, file, toDigitizeOptions(settings));
      if (!result.stitches || result.stitches.length === 0) {
        alert('No stitches generated by backend.');
        return;
      }
      await downloadDesign(result.stitches, settings.name.trim() || undefined, fmt);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : `Failed to generate the ${fmt.toUpperCase()} file.`);
    } finally {
      setRendering(false);
    }
  };

  const handleDownloadSVG = () => {
    if (!file || !imgData) return;
    try {
      const stitches = generateDSTPoints(imgData, selStitch, selFabric);
      if (stitches.length === 0) {
         alert("No stitches generated.");
         return;
      }

      const svgPaths = [];
      let currentPath = '';
      let activeHex = '#000000';
      const toHex = (n: number) => ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2);
      
      let prevX = 0, prevY = 0;
      let pathLen = 0;
      for (const [x, y, cmd, r, g, b] of stitches) {
        if (cmd === 'STOP' || pathLen > 5000) {
          if (currentPath) svgPaths.push(`<path d="${currentPath}" fill="none" stroke="${activeHex}" stroke-width="0.3" stroke-linecap="round" stroke-linejoin="round"/>`);
          currentPath = '';
          pathLen = 0;
          if (cmd === 'STOP') {
            activeHex = `#${toHex(r as number)}${toHex(g as number)}${toHex(b as number)}`;
          }
        }
        
        if (cmd === 'JUMP') {
          if (!currentPath && typeof r === 'number') {
            activeHex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
          }
          currentPath += ` M ${(x as number).toFixed(2)} ${(-(y as number)).toFixed(2)}`;
          prevX = x as number; prevY = y as number;
          pathLen++;
        } else if (cmd === 'STITCH') {
          if (x !== prevX || y !== prevY) {
            if (!currentPath) {
              currentPath = `M ${prevX.toFixed(2)} ${(-prevY).toFixed(2)}`;
            }
            currentPath += ` L ${(x as number).toFixed(2)} ${(-(y as number)).toFixed(2)}`;
            pathLen++;
          }
          prevX = x as number; prevY = y as number;
        }
      }
      if (currentPath) svgPaths.push(`<path d="${currentPath}" fill="none" stroke="${activeHex}" stroke-width="0.3" stroke-linecap="round" stroke-linejoin="round"/>`);

      const xs = stitches.map(s => s[0] as number);
      const ys = stitches.map(s => -(s[1] as number));
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const w = maxX - minX;
      const h = maxY - minY;

      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX-1} ${minY-1} ${w+2} ${h+2}" width="${w}mm" height="${h}mm">
        ${svgPaths.join('\\n')}
      </svg>`;

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'embroidery_pxy888.svg';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate SVG.');
    }
  };

  const handlePreviewOnBag = () => {
    if (cvsMain.current && cvsMain.current.width > 0) {
      try {
        const dataUrl = cvsMain.current.toDataURL('image/png');
        const size = hoopSize(settings);
        const patchData = {
          title: settings.name.trim() || 'Embroidery Design',
          dataUrl,
          timestamp: Date.now(),
          stitchCount: result?.stitch_count || 0,
          width_mm: size.w,
          height_mm: size.h,
        };
        localStorage.setItem('latest_embroidery_patch', JSON.stringify(patchData));
      } catch (e) {
        console.warn('Failed to save embroidery patch to localStorage', e);
      }
      window.location.href = '/cuecase?from=embroidery';
    }
  };

  const handleDownloadPDF = () => {
    if (!result || !cvsMain.current) return;
    setRendering(true);
    
    // Lazy load jspdf to avoid blowing up initial bundle size
    Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]).then(([{ jsPDF }, { default: autoTable }]) => {
      try {
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.text('Production Worksheet', 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('jb888 Studio - Designing', 14, 28);
        doc.setTextColor(0);
        
        // Add image
        const imgDataUrl = cvsMain.current!.toDataURL('image/jpeg', 1.0);
        const imgW = 120;
        const imgH = (cvsMain.current!.height / cvsMain.current!.width) * imgW;
        doc.addImage(imgDataUrl, 'JPEG', 14, 35, imgW, imgH);
        
        // Add metrics box on the right
        doc.setFontSize(10);
        const rightCol = 145;
        
        doc.text(`Stitches: ${result.stitchCount.toLocaleString()}`, rightCol, 40);
        doc.text(`Colors: ${result.numColors}`, rightCol, 46);
        doc.text(`Thread Segments: ${result.threadCount.toLocaleString()}`, rightCol, 52);
        doc.text(`Complexity: ${result.complexityLabel}`, rightCol, 58);
        doc.text(`Machine Time: ${result.hours} hrs`, rightCol, 64);
        doc.text(`Budget Est: INR ${result.fabricCost + result.threadCost + result.stabCost + result.misc}`, rightCol, 70);
        
        // Add Stop Sequence Table below image
        const startY = Math.max(35 + imgH + 15, 80);
        doc.setFontSize(12);
        doc.text('Stop Sequence (Palette):', 14, startY - 4);
        
        const tableBody = result.palette.map((c: any, i: number) => {
          return [
            i + 1,
            '', // empty for color block
            c.name,
            c.dmc,
            `${c.pct}%`
          ];
        });

        autoTable(doc, {
          startY: startY,
          head: [['#', 'Color', 'Name', 'Code', 'Coverage']],
          body: tableBody,
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] }, // indigo-600
          didDrawCell: (data) => {
            // Draw a color box in the Color column (index 1)
            if (data.section === 'body' && data.column.index === 1) {
              const hex = result.palette[data.row.index].hex;
              doc.setFillColor(hex);
              doc.rect(data.cell.x + 4, data.cell.y + 1, data.cell.width - 8, data.cell.height - 2, 'F');
              doc.setDrawColor(0);
              doc.setLineWidth(0.1);
              doc.rect(data.cell.x + 4, data.cell.y + 1, data.cell.width - 8, data.cell.height - 2, 'S');
            }
          }
        });

        doc.save('Production_Worksheet.pdf');
      } catch (err) {
        console.error(err);
        alert('Failed to generate PDF.');
      } finally {
        setRendering(false);
      }
    });
  };

  // Measured numbers (from the generated design) replace the simulator's rough estimate wherever both would show
  const measured = dstSource?.analysis && !dstSource.analysis.empty ? dstSource.analysis : null;
  const fmtHours = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${h.toFixed(1)} hrs`);
  const view = result && measured ? (() => {
    const hours = Math.max(0.05, measured.runtime_min / 60);
    const labor = Math.round(hours * 200);
    const total = result.fabricCost + result.threadCost + result.stabCost + result.misc + labor;
    return {
      ...result, stitchCount: measured.stitch_count, hours, labor, total, complexityLabel: measured.complexity, numColors: measured.colors,
      feasibility: total <= budget ? 'Feasible' : total <= budget * 1.3 ? 'Tight' : 'Over Budget',
      summary: `This ${measured.complexity.toLowerCase()} design (${measured.width_mm} × ${measured.height_mm} mm) uses ${selStitch.name} on ${selFabric.name}: ${measured.stitch_count.toLocaleString()} stitches, ${measured.colors} colour${measured.colors > 1 ? 's' : ''}, ${measured.top_thread_m} m of thread. Machine time: about ${fmtHours(hours)}.`,
    };
  })() : result;


  const profile = fabricProfile(selFabric.id);
  const [dragging, setDragging] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!moreOpen) return;
    const away = (e: MouseEvent) => { if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [moreOpen]);

  // Paste an image straight from the clipboard (screenshots, copied logos)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find(x => x.type.startsWith('image/'));
      if (f) acceptFile(f);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const VIEWS = [
    { id: 'main', icon: '🧵', label: 'Stitch sim', hint: 'How the stitched design will look' },
    { id: 'dst', icon: '📐', label: 'DST preview', hint: 'The real machine file, with rulers, hoop and playback' },
    { id: 'zoom', icon: '🔍', label: 'Close-up', hint: 'Individual thread geometry, 8× magnified' },
    { id: 'chart', icon: '🎨', label: 'Colour chart', hint: 'Thread colour map' },
    { id: 'outline', icon: '✏️', label: 'Needle path', hint: 'Where the needle follows contours' },
    { id: 'orig', icon: '🖼', label: 'Original', hint: 'Your uploaded artwork' },
  ];
  const curView = VIEWS.find(v => v.id === activeTab) ?? VIEWS[0];

  const stepper = (step: 1 | 2 | 3) => (
    <ol className="flex items-center justify-center gap-2 sm:gap-3 text-xs font-semibold text-gray-400" aria-label="Progress">
      {['Upload artwork', 'Tune the stitching', 'Export to machine'].map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-current={step === i + 1 ? 'step' : undefined}>
          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] ${step > i + 1 ? 'bg-emerald-600 text-white' : step === i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{step > i + 1 ? '✓' : i + 1}</span>
          <span className={`hidden sm:inline ${step === i + 1 ? 'text-gray-900' : ''}`}>{s}</span>
          {i < 2 && <span aria-hidden className="w-6 sm:w-10 h-px bg-gray-200" />}
        </li>
      ))}
    </ol>
  );

  if (!file) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="pt-2 space-y-4 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Turn any logo into a stitch file</h1>
          <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto">Drop your artwork, check a realistic thread preview, then export for your machine. DST, PES, JEF, EXP, VP3 and XXX supported.</p>
          {stepper(1)}
        </div>

        <label
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`block cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-14 text-center transition-all focus-within:ring-2 focus-within:ring-indigo-400
            ${dragging ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : 'border-gray-300 bg-surface hover:border-indigo-400 hover:bg-indigo-50/40'}`}
        >
          <div className="text-5xl mb-3" aria-hidden>{dragging ? '📥' : '🧵'}</div>
          <div className="text-lg font-bold text-gray-900">{dragging ? 'Drop to start' : 'Drag & drop your artwork here'}</div>
          <div className="text-sm text-gray-500 mt-1">or <span className="text-indigo-600 font-semibold underline underline-offset-2">browse files</span> · you can also paste from the clipboard</div>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] text-gray-500">
            {['PNG', 'JPG', 'WEBP', 'SVG', 'Transparent background works best'].map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100">{t}</span>)}
          </div>
          <input type="file" className="sr-only" accept={ACCEPT} onChange={(e) => { acceptFile(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {uploadError && <p role="alert" className="text-sm text-red-600 text-center">{uploadError}</p>}

        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-2">No artwork handy? Start from a sample</h2>
          <DesignLibrary wide onPick={acceptFile} />
        </div>
      </div>
    );
  }

  const stats = view ? [
    { k: 'Stitches', v: view.stitchCount.toLocaleString() },
    { k: 'Colours', v: String(view.numColors) },
    { k: 'Size', v: measured ? `${measured.width_mm}×${measured.height_mm} mm` : '—' },
    { k: 'Sew time', v: measured ? fmtHours(view.hours) : `${view.hours} hrs` },
    { k: 'Complexity', v: view.complexityLabel },
  ] : [];

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Embroidery digitizing studio: edit and export your stitch file</h1>
      <canvas ref={cvsWork} className="hidden" />
      {cropping && file && <CropModal file={file} onClose={() => setCropping(false)} onApply={f => { setCropping(false); setFile(f); }} />}

      {/* Action bar */}
      <div className="sticky top-12 z-40 -mx-3 sm:mx-0 px-3 sm:px-4 py-2 sm:rounded-xl bg-surface/95 backdrop-blur border-b sm:border border-gray-200 shadow-sm flex flex-wrap items-center gap-2">
        <div className="hidden md:block mr-2">{stepper(rendering || dstBusy ? 2 : 3)}</div>
        <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">
          {(rendering || dstBusy) ? (
            <span className="inline-flex items-center gap-2 text-gray-500"><span className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />Updating preview…</span>
          ) : dstSource ? <span className="text-emerald-600 font-semibold">✓ Ready to export</span> : null}
        </div>
        <label className="cursor-pointer h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
          <span aria-hidden>📁</span><span className="hidden sm:inline">Change image</span>
          <input type="file" className="sr-only" accept={ACCEPT} onChange={(e) => { acceptFile(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <div ref={moreRef} className="relative">
          <button type="button" onClick={() => setMoreOpen(o => !o)} aria-haspopup="menu" aria-expanded={moreOpen}
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">More ▾</button>
          {moreOpen && (
            <div role="menu" className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-gray-200 bg-surface shadow-xl p-1">
              {([
                ['🖼  Save preview as PNG', 'png'],
                ['📐  Export stitch map as SVG', 'svg'],
                ['📄  Production worksheet (PDF)', 'pdf'],
                ['🎱  Preview on 3D Bag', 'bag'],
              ] as const).map(([l, kind]) => (
                <button key={l} role="menuitem" type="button" onClick={() => { setMoreOpen(false); (kind === 'png' ? handleDownloadPNG : kind === 'svg' ? handleDownloadSVG : kind === 'pdf' ? handleDownloadPDF : handlePreviewOnBag)(); }}
                        className="w-full text-left rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 whitespace-pre">{l}</button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handlePreviewOnBag}
          disabled={!result || !cvsMain.current}
          title="Place this embroidered design directly onto the 3D Cue Case Bag"
          className="h-9 px-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          <span>🎱</span>
          <span className="hidden @lg:inline">3D Bag Preview</span>
        </button>
        <ExportMenu onExport={handleExport} variant="solid" label="Export" />
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Stage */}
        <div className="flex-1 min-w-0 w-full space-y-4 order-1 lg:order-2">
          <div className="bg-surface rounded-xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="flex items-center gap-1 p-2 border-b border-gray-100 overflow-x-auto scrollbar-none" role="tablist" aria-label="Preview mode">
              {VIEWS.map(v => (
                <button key={v.id} role="tab" type="button" aria-selected={activeTab === v.id} title={v.hint} onClick={() => setActiveTab(v.id)}
                        className={`shrink-0 h-9 px-3 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 transition-colors ${activeTab === v.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <span aria-hidden>{v.icon}</span>{v.label}
                </button>
              ))}
            </div>

            <div className="relative flex justify-center bg-gray-50 p-2 sm:p-6 min-h-[300px] sm:min-h-[520px] overflow-hidden">
              {(rendering || (activeTab === 'dst' && dstBusy && !!dstSource)) && (
                <div className="absolute inset-0 z-10 bg-surface/70 flex items-center justify-center backdrop-blur-sm">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              )}
              <div className={activeTab === 'main' ? 'block text-center self-center' : 'hidden'}>
                <canvas ref={cvsMain} className="rounded-lg border border-gray-200 max-w-full h-auto shadow-sm bg-[#f7f4ef]" />
              </div>
              <div className={activeTab === 'zoom' ? 'block text-center self-center' : 'hidden'}>
                <canvas ref={cvsZoom} className="rounded-lg border border-gray-200 max-w-full h-auto shadow-sm bg-[#f7f4ef]" />
              </div>
              <div className={activeTab === 'chart' ? 'block text-center self-center' : 'hidden'}>
                <canvas ref={cvsChart} className="rounded-lg border border-gray-200 max-w-full h-auto shadow-sm bg-surface" />
              </div>
              <div className={activeTab === 'outline' ? 'block text-center self-center' : 'hidden'}>
                <canvas ref={cvsOutline} className="rounded-lg border border-gray-200 max-w-full h-auto shadow-sm bg-[#f7f4ef]" />
              </div>
              {activeTab === 'dst' && (
                <div className="w-full">
                  {dstError && <p className="mb-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">{dstError}</p>}
                  {dstSource && <DstPreview source={dstSource} threadId={threadId} onThreadChange={setThreadId} />}
                  {!dstSource && !dstBusy && !dstError && <p className="text-sm text-gray-500 text-center py-16">Upload an image to see its DST file preview.</p>}
                  {dstBusy && !dstSource && <p className="text-sm text-gray-500 text-center py-16">Building DST file…</p>}
                </div>
              )}
              <div className={activeTab === 'orig' ? 'block text-center self-center' : 'hidden'}>
                <canvas ref={cvsOrig} className="rounded-lg border border-gray-200 max-w-full h-auto shadow-sm bg-surface" />
              </div>
            </div>
            <p className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500">{activeTab === 'main' ? selStitch.desc : curView.hint}</p>
          </div>

          {/* Live stats */}
          {view && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {stats.map(s => (
                <div key={s.k} className="bg-surface rounded-xl border border-gray-100 px-3 py-2.5">
                  <div className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase">{s.k}</div>
                  <div className="text-base font-bold text-gray-900 truncate">{s.v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Threads + cost */}
          {view && (
            <div className="bg-surface rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Threads &amp; cost</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{measured ? 'Measured from the generated design.' : 'Rough estimate: generating the real design…'}</p>
                </div>
                <label className="flex items-center gap-3 bg-gray-50 px-3 h-9 rounded-full border border-gray-200">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Budget</span>
                  <input type="range" min="200" max="20000" step="100" value={budget} onChange={(e) => setBudget(+e.target.value)}
                         aria-label="Budget" className="w-24 h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                  <span className="text-sm font-bold text-indigo-700 min-w-[56px]">₹{budget.toLocaleString('en-IN')}</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Colour palette (DMC)</h4>
                  <div className="flex h-3 rounded-full overflow-hidden mb-4">
                    {view.palette.map((c:any, i:number) => <div key={i} style={{ flex: c.pct, backgroundColor: c.hex }} />)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {view.palette.map((c:any, i:number) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md p-1.5 pr-3">
                        <div className="w-5 h-5 rounded shadow-sm border border-black/10" style={{ backgroundColor: c.hex }} />
                        <div>
                          <div className="text-xs font-bold leading-none mb-1">{c.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono leading-none">{c.dmc} · {c.pct}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Budget estimate</h4>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Materials (fabric, thread, stabilizer)</span>
                    <span className="font-medium">₹{(view.fabricCost + view.threadCost + view.stabCost + view.misc).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Labour ({measured ? fmtHours(view.hours) : `${view.hours}h`})</span>
                    <span className="font-medium">₹{view.labor.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-indigo-700 mt-3 pt-3 border-t border-gray-100">
                    <span>Total</span><span>₹{view.total.toLocaleString('en-IN')}</span>
                  </div>
                  <span className={`mt-3 inline-block px-3 py-1 text-xs font-bold rounded-full ${view.feasibility === 'Feasible' ? 'bg-green-100 text-green-800' : view.feasibility === 'Tight' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>
                    {view.feasibility} · budget ₹{budget.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <p className="mt-5 bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded-r-lg text-sm text-indigo-900 leading-relaxed font-medium">{view.summary}</p>
            </div>
          )}
        </div>

        {/* Setup sidebar */}
        <aside className="w-full lg:w-80 shrink-0 space-y-3 order-2 lg:order-1 lg:sticky lg:top-[7.5rem] lg:max-h-[calc(100vh-8.5rem)] lg:overflow-y-auto lg:pr-1">
          <Section title="Artwork" summary={file.name.length > 18 ? file.name.slice(0, 16) + '…' : file.name} open>
            <div className="flex justify-center"><canvas ref={cvsOrigSide} className="rounded-lg border border-gray-200 max-w-full h-auto bg-surface" /></div>
            <button type="button" onClick={() => setCropping(true)}
                    className="mt-3 w-full h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">✂ Crop to the mark</button>
            {uploadError && <p role="alert" className="mt-2 text-xs text-red-600">{uploadError}</p>}
          </Section>

          <Section title="Fabric" summary={selFabric.name} open>
            <div className="grid grid-cols-3 gap-2">
              {FABRICS.map((f:any) => (
                <button key={f.id} type="button" onClick={() => setSelFabric(f)} aria-pressed={selFabric.id === f.id}
                        className={`border rounded-lg p-2 text-center select-none transition-all ${selFabric.id === f.id ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-100' : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'}`}>
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <div className="text-[10px] font-bold leading-tight">{f.name}</div>
                  <div className="text-[9px] text-gray-400">{f.sub}</div>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Stitch method" summary={selStitch.name} open>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {CATS.map(c => (
                <button key={c.id} type="button" onClick={() => setActiveCat(c.id)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${activeCat === c.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>{c.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STITCHES.filter((s: any) => s.cat === activeCat).map((s: any) => (
                <button key={s.id} type="button" onClick={() => setSelStitch(s)} aria-pressed={selStitch.id === s.id}
                        className={`border rounded-lg p-1.5 text-center select-none transition-all ${selStitch.id === s.id ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'}`}>
                  <StitchSwatch data={previews[s.id]} thread={thread} fallback={s.icon} />
                  <div className="text-[10px] font-bold leading-tight mt-1">{s.name}</div>
                  <div className="text-[9px] text-gray-400">{s.sub}</div>
                </button>
              ))}
            </div>
            <StitchPreviewPanel name={selStitch.name} desc={selStitch.desc} data={previews[selStitch.id]} thread={thread} />
          </Section>

          <Section title="Design settings" summary={settings.name.trim() || undefined}>
            <DesignSettingsPanel value={settings} onChange={patchSettings} autoPull={profile.pull} autoDensity={profile.density} fabricName={selFabric.name} />
          </Section>

          <Section title="Design library">
            <DesignLibrary onPick={acceptFile} />
          </Section>
        </aside>
      </div>
    </div>
  );
}
