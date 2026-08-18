'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CATS, STITCHES, FABRICS, extractPalette, calcMetrics, buildResult, drawStitch, drawZoom, drawChart, drawOutline, generateDSTPoints } from '../lib/simulator';
import { digitizeShape, downloadDst } from '../lib/api';

interface Props {
  file: File | null;
}

export default function AdvancedSimulator({ file }: Props) {
  const [activeCat, setActiveCat] = useState('fill');
  const [selStitch, setSelStitch] = useState<any>(STITCHES[0]);
  const [selFabric, setSelFabric] = useState<any>(FABRICS[0]);
  const [budget, setBudget] = useState(3000);
  const [activeTab, setActiveTab] = useState('main');
  const [imgData, setImgData] = useState<ImageData | null>(null);
  const [palette, setPalette] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [rendering, setRendering] = useState(false);

  const cvsWork = useRef<HTMLCanvasElement>(null);
  const cvsMain = useRef<HTMLCanvasElement>(null);
  const cvsZoom = useRef<HTMLCanvasElement>(null);
  const cvsChart = useRef<HTMLCanvasElement>(null);
  const cvsOutline = useRef<HTMLCanvasElement>(null);
  const cvsOrig = useRef<HTMLCanvasElement>(null);

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
    cvs.style.height = Math.round(H * ds) + 'px';
  }

  const handleDownloadPNG = () => {
    if (cvsMain.current && cvsMain.current.width > 0) {
      const a = document.createElement('a');
      a.href = cvsMain.current.toDataURL();
      a.download = 'embroidery_preview.png';
      a.click();
    }
  };

  const handleDownloadDST = async () => {
    if (!file || !imgData) return;
    try {
      setRendering(true);
      // Generate exact same points as the simulator visually does
      const stitches = generateDSTPoints(imgData, selStitch, selFabric);
      
      if (stitches.length === 0) {
         alert("No stitches generated. Try a different method or image.");
         return;
      }
      
      // We directly hit the backend DST exporter with the simulated points
      // We only pass x, y, and cmd to the backend.
      const payload = stitches.map(s => [s[0], s[1], s[2]]);
      await downloadDst(payload);
    } catch (err) {
      console.error(err);
      alert('Failed to generate machine DST file.');
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

  if (!file) {
    return <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500">Upload an image to start the simulator.</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <canvas ref={cvsWork} className="hidden" />

      {/* Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold tracking-widest uppercase text-gray-400 mb-4">Stitch Method</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {CATS.map(c => (
              <button 
                key={c.id} 
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${activeCat === c.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                onClick={() => setActiveCat(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {STITCHES.filter((s:any) => s.cat === activeCat).map((s:any) => (
              <div 
                key={s.id}
                onClick={() => setSelStitch(s)}
                className={`border rounded-lg p-2 text-center cursor-pointer select-none transition-all ${selStitch.id === s.id ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
              >
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-[10px] font-bold leading-tight">{s.name}</div>
                <div className="text-[9px] text-gray-400">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800">
            {selStitch.desc}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold tracking-widest uppercase text-gray-400 mb-4">Fabric & Material</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
            {FABRICS.map((f:any) => (
              <div 
                key={f.id}
                onClick={() => setSelFabric(f)}
                className={`border rounded-lg p-2 text-center cursor-pointer select-none transition-all ${selFabric.id === f.id ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-100' : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'}`}
              >
                <div className="text-2xl mb-1">{f.icon}</div>
                <div className="text-[10px] font-bold leading-tight">{f.name}</div>
                <div className="text-[9px] text-gray-400">{f.sub}</div>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-bold tracking-widest uppercase text-gray-400 mb-4">Target Budget (₹)</h3>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="200" max="20000" step="100" 
              value={budget} 
              onChange={(e) => setBudget(+e.target.value)}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="font-bold text-indigo-700 min-w-[80px] text-right">₹{budget.toLocaleString('en-IN')}</span>
          </div>
        </div>

      </div>

      {/* Preview Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 relative">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'main' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} onClick={() => setActiveTab('main')}>Stitch Sim</button>
            <button className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'zoom' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} onClick={() => setActiveTab('zoom')}>🔍 Closeup</button>
            <button className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'chart' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} onClick={() => setActiveTab('chart')}>⬛ DMC Chart</button>
            <button className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'outline' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} onClick={() => setActiveTab('outline')}>✏ Path Guide</button>
            <button className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'orig' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} onClick={() => setActiveTab('orig')}>🖼 Original</button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownloadSVG} className="text-sm font-bold text-gray-600 border border-gray-300 px-4 py-1.5 rounded-full hover:bg-gray-50 transition-colors">
              📐 Export SVG
            </button>
            <button onClick={handleDownloadPNG} className="text-sm font-bold text-gray-600 border border-gray-300 px-4 py-1.5 rounded-full hover:bg-gray-50 transition-colors">
              ⬇ Save PNG
            </button>
            <button onClick={handleDownloadDST} className="text-sm font-bold text-white bg-indigo-600 border border-indigo-600 px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-colors shadow-sm">
              🏭 Export .DST
            </button>
          </div>
        </div>

        <div className="relative flex justify-center bg-gray-50 rounded-xl p-4 min-h-[400px]">
          {rendering && (
            <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center rounded-xl backdrop-blur-sm">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          )}
          
          <div className={activeTab === 'main' ? 'block text-center' : 'hidden'}>
            <canvas ref={cvsMain} className="rounded-lg border border-gray-200 max-w-full shadow-sm bg-[#f7f4ef]" />
            <p className="mt-4 text-xs text-gray-500 max-w-lg mx-auto">{selStitch.desc}</p>
          </div>
          <div className={activeTab === 'zoom' ? 'block text-center' : 'hidden'}>
            <canvas ref={cvsZoom} className="rounded-lg border border-gray-200 max-w-full shadow-sm bg-[#f7f4ef]" />
            <p className="mt-4 text-xs text-gray-500">8× magnified centre crop — shows individual thread geometry</p>
          </div>
          <div className={activeTab === 'chart' ? 'block text-center' : 'hidden'}>
            <canvas ref={cvsChart} className="rounded-lg border border-gray-200 max-w-full shadow-sm bg-white" />
          </div>
          <div className={activeTab === 'outline' ? 'block text-center' : 'hidden'}>
            <canvas ref={cvsOutline} className="rounded-lg border border-gray-200 max-w-full shadow-sm bg-[#f7f4ef]" />
            <p className="mt-4 text-xs text-gray-500">Machine needle path — edges where stitching follows contour</p>
          </div>
          <div className={activeTab === 'orig' ? 'block text-center' : 'hidden'}>
            <canvas ref={cvsOrig} className="rounded-lg border border-gray-200 max-w-full shadow-sm bg-white" />
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-extrabold text-gray-900">Analysis & Budget</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-[10px] text-gray-500 font-medium tracking-wide uppercase mb-1">Stitch Count</div>
              <div className="text-xl font-bold">{result.stitchCount.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-[10px] text-gray-500 font-medium tracking-wide uppercase mb-1">Thread Segments</div>
              <div className="text-xl font-bold">{result.threadCount.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-[10px] text-gray-500 font-medium tracking-wide uppercase mb-1">Machine Time</div>
              <div className="text-xl font-bold">{result.hours} <span className="text-xs font-normal">hrs</span></div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-[10px] text-gray-500 font-medium tracking-wide uppercase mb-1">Complexity</div>
              <div className="text-lg font-bold text-indigo-700">{result.complexityLabel}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-[10px] text-gray-500 font-medium tracking-wide uppercase mb-1">DMC Colors</div>
              <div className="text-xl font-bold">{result.numColors}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-[10px] text-gray-500 font-medium tracking-wide uppercase mb-1">Thread Skeins</div>
              <div className="text-xl font-bold">{result.totalSkeins}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Color Palette (DMC)</h4>
              <div className="flex h-3 rounded-full overflow-hidden mb-4">
                {result.palette.map((c:any, i:number) => (
                  <div key={i} style={{ flex: c.pct, backgroundColor: c.hex }}></div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {result.palette.map((c:any, i:number) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md p-1.5 pr-3">
                    <div className="w-5 h-5 rounded shadow-sm border border-black/10" style={{ backgroundColor: c.hex }}></div>
                    <div>
                      <div className="text-xs font-bold leading-none mb-1">{c.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono leading-none">{c.dmc} · {c.pct}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Budget Estimate</h4>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Materials (Fabric, Thread, Stabilizer)</span>
                <span className="font-medium">₹{(result.fabricCost + result.threadCost + result.stabCost + result.misc).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Labor ({result.hours}h)</span>
                <span className="font-medium">₹{result.labor.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-indigo-700 mt-4 pt-4 border-t border-gray-100">
                <span>Total Estimated Cost</span>
                <span>₹{result.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${result.feasibility === 'Feasible' ? 'bg-green-100 text-green-800' : result.feasibility === 'Tight' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>
                  {result.feasibility} (Budget: ₹{budget.toLocaleString('en-IN')})
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
            <p className="text-sm text-indigo-900 leading-relaxed font-medium">{result.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}
