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

export interface DigitizeResponse {
  stitches: [number, number, string][];
  metrics: StitchMetrics;
}

let rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
if (rawApiUrl.endsWith('/')) {
  rawApiUrl = rawApiUrl.slice(0, -1);
}
if (!rawApiUrl.endsWith('/api')) {
  rawApiUrl += '/api';
}
const API_BASE = rawApiUrl;

export async function digitizeShape(width_mm: number, height_mm: number, stitch_type: string, fabric_id: string, file?: File | null): Promise<DigitizeResponse> {
  const formData = new FormData();
  formData.append('width_mm', width_mm.toString());
  formData.append('height_mm', height_mm.toString());
  formData.append('stitch_type', stitch_type);
  formData.append('fabric', fabric_id);
  if (file) {
    formData.append('file', file);
  }

  const res = await fetch(`${API_BASE}/digitize`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to digitize');
  return res.json();
}

export async function downloadDst(stitches: [number, number, string][]) {
  const res = await fetch(`${API_BASE}/export/dst`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stitches }),
  });
  if (!res.ok) throw new Error('Failed to export DST');
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'embroidery_pxy888.dst';
  a.click();
  window.URL.revokeObjectURL(url);
}
