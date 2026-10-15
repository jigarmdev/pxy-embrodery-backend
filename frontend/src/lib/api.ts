export interface StitchMetrics {
  stitch_count: number;
  color_changes: number;
  top_thread_meters: number;
  bobbin_thread_meters: number;
  estimated_runtime_minutes: number;
  pricing_breakdown: {
    base_setup_fee: number;
    stitch_fee: number;
    thread_material_cost: number;
    total_estimated_price: number;
    currency: string;
  };
}

export interface Placement {
  /** mm per pixel of the resized image the backend worked on */
  scale: number;
  resized: [number, number];
  /** centre of the artwork crop, in resized-image pixels */
  crop_center: [number, number];
}

export interface AnalysisWarning { level: 'info' | 'warn'; code: string; message: string }
export interface Analysis {
  empty?: boolean;
  stitch_count: number; jumps: number; trims: number; colors: number; color_changes: number;
  width_mm: number; height_mm: number;
  top_thread_m: number; bobbin_thread_m: number; avg_stitch_mm: number; max_stitch_mm: number;
  dense_share: number; complexity: string; runtime_min: number;
  recommend: { needle: string; stabilizer: string; thread: string; note: string; fabric: string };
  warnings: AnalysisWarning[];
  colours: { stitches: number; length_m: number; hex?: string; name?: string; nearest_hex?: string }[];
  generation_ms: number | null;
}

export interface DigitizeResponse {
  stitches: [number, number, string, number | null, number | null, number | null][];
  metrics: StitchMetrics;
  placement: Placement | null;
  palette: { hex: string; rgb: [number, number, number]; share: number }[];
  image: { background?: string; colors_found?: number };
  generation_ms: number;
  analysis: Analysis;
}

/** Everything the Design settings panel can change. undefined = let the backend use the fabric profile. */
export interface DigitizeOptions {
  widthMm?: number;
  heightMm?: number;
  underlay?: string;
  pullComp?: number;
  density?: number;
  angle?: number;
  stitchLen?: number;
  maxColors?: number;
  background?: string;
  enclosedAsFabric?: boolean;
}

const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`;
  }
  return 'http://localhost:8000/api';
};

const API_BASE = getApiBase();

export async function digitizeShape(stitch_type: string, fabric_id: string, file: File | null | undefined, opts: DigitizeOptions = {}): Promise<DigitizeResponse> {
  const formData = new FormData();
  formData.append('width_mm', String(opts.widthMm ?? 80));
  formData.append('height_mm', String(opts.heightMm ?? 80));
  formData.append('stitch_type', stitch_type);
  formData.append('fabric', fabric_id);
  formData.append('underlay', opts.underlay ?? 'auto');
  if (opts.pullComp !== undefined) formData.append('pull_comp', String(opts.pullComp));
  if (opts.density !== undefined) formData.append('density', String(opts.density));
  if (opts.angle !== undefined) formData.append('angle', String(opts.angle));
  if (opts.stitchLen !== undefined) formData.append('stitch_len', String(opts.stitchLen));
  if (opts.maxColors !== undefined) formData.append('max_colors', String(opts.maxColors));
  if (opts.background !== undefined) formData.append('background', opts.background);
  if (opts.enclosedAsFabric !== undefined) formData.append('enclosed_as_fabric', String(opts.enclosedAsFabric));
  if (file) {
    formData.append('file', file);
  }

  const res = await fetch(`${API_BASE}/digitize`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    let detail = 'Failed to digitize';
    try { const j = await res.json(); if (typeof j.detail === 'string') detail = j.detail; } catch { /* keep default */ }
    throw new Error(detail);
  }
  return res.json();
}

export interface MethodPreview {
  stitches: [number, number, 0 | 1][];
  stitch_count: number;
}

/** Real stitches (made by the backend generators) for a sample shape, for every stitch method or one. */
export async function fetchMethodPreviews(opts: DigitizeOptions & { method?: string } = {}): Promise<Record<string, MethodPreview>> {
  const q = new URLSearchParams();
  if (opts.method) q.set('method', opts.method);
  if (opts.density !== undefined) q.set('density', String(opts.density));
  if (opts.pullComp !== undefined) q.set('pull_comp', String(opts.pullComp));
  if (opts.underlay) q.set('underlay', opts.underlay);
  if (opts.angle !== undefined) q.set('angle', String(opts.angle));
  if (opts.stitchLen !== undefined) q.set('stitch_len', String(opts.stitchLen));
  const res = await fetch(`${API_BASE}/stitch-methods/preview?${q}`);
  if (!res.ok) throw new Error('Could not load stitch previews');
  return (await res.json()).methods;
}

export const EXPORT_FORMATS = [
  { id: 'dst', label: 'DST', brands: 'Tajima · most commercial machines', colours: false },
  { id: 'pes', label: 'PES', brands: 'Brother · Baby Lock', colours: true },
  { id: 'jef', label: 'JEF', brands: 'Janome', colours: true },
  { id: 'exp', label: 'EXP', brands: 'Melco · Bernina', colours: false },
  { id: 'vp3', label: 'VP3', brands: 'Husqvarna Viking · Pfaff', colours: true },
  { id: 'xxx', label: 'XXX', brands: 'Singer', colours: false },
] as const;
export type ExportFormat = typeof EXPORT_FORMATS[number]['id'];

/** Ask the backend for the real machine-file bytes without triggering a download. */
export async function exportDesignBlob(stitches: unknown[], name?: string, fmt: ExportFormat = 'dst'): Promise<Blob> {
  const res = await fetch(`${API_BASE}/export/${fmt}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stitches, name: name || null }),
  });
  if (!res.ok) {
    let detail = `Failed to export ${fmt.toUpperCase()}`;
    try { const j = await res.json(); if (typeof j.detail === 'string') detail = j.detail; } catch { /* keep default */ }
    throw new Error(detail);
  }
  return res.blob();
}
export const exportDstBlob = (stitches: unknown[], name?: string) => exportDesignBlob(stitches, name, 'dst');

/** Save a blob as a file. */
export function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  window.URL.revokeObjectURL(url);
}

export const safeFileName = (name?: string) => (name || '').trim().replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'embroidery_pxy888';

export async function downloadDesign(stitches: unknown[], name?: string, fmt: ExportFormat = 'dst') {
  saveBlob(await exportDesignBlob(stitches, name, fmt), `${safeFileName(name)}.${fmt}`);
}

export interface ParsedDst {
  name: string;
  header: Record<string, string>;
  /** Stitch = [x_mm, y_mm, code] with code 0=stitch 1=jump 2=trim. DST is y-up. */
  blocks: { stitches: [number, number, 0 | 1 | 2][] }[];
  bounds_mm: [number, number, number, number];
  analysis?: Analysis;
  stats: {
    stitches: number; jumps: number; trims: number; color_blocks: number;
    width_mm: number; height_mm: number; avg_stitch_mm: number; max_stitch_mm: number; file_bytes: number;
  };
}

/** Decode a .dst file on the backend (pyembroidery) for previewing. */
export async function parseDst(file: Blob, name = 'design.dst', fabric = 'cotton'): Promise<ParsedDst> {
  const formData = new FormData();
  formData.append('file', file, name);
  formData.append('fabric', fabric);
  const res = await fetch(`${API_BASE}/dst/parse`, { method: 'POST', body: formData });
  if (!res.ok) {
    let detail = 'Could not read this DST file';
    try { detail = (await res.json()).detail ?? detail; } catch { /* keep default */ }
    throw new Error(detail);
  }
  return res.json();
}

export const downloadDst = (stitches: unknown[], name?: string) => downloadDesign(stitches, name, 'dst');
