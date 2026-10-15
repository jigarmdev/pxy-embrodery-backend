// Canvas renderer for decoded DST files: a realistic "embroidery file" view (shaded, overlapping
// threads with shadows and needle holes) and a flat "stitch plan" view, plus mm rulers and grid.
// Coordinates: DST is y-up in millimetres; the view maps mm -> screen px (screen y is flipped).

export type StitchPt = [number, number, 0 | 1 | 2]; // x_mm, y_mm, 0=stitch 1=jump 2=trim
export interface View { s: number; x: number; y: number } // s = px per mm

/** How a thread looks: width, gloss and texture. See lib/threads.ts for the real-world presets. */
export interface ThreadStyle {
  widthMm: number;      // physical thread width
  sheen: number;        // 0 matte .. 1 mirror-like gloss
  fuzz: number;         // 0 smooth .. 1 fibrous (cotton)
  metallic: boolean;    // foil banding + sparkle
  glow: number;         // soft halo (neon / glow-in-the-dark)
  variegated: boolean;  // colour shifts along the thread
  plies?: number;       // strands twisted together (2 = typical embroidery thread, 3 = cotton)
}
export const DEFAULT_STYLE: ThreadStyle = { widthMm: 0.4, sheen: 0.55, fuzz: 0, metallic: false, glow: 0, variegated: false };

export interface RenderOpts {
  ctx: CanvasRenderingContext2D;
  w: number; h: number; dpr: number;
  view: View;
  blocks: { stitches: StitchPt[] }[];
  colors: string[];
  hidden: Set<number>;
  limit: number;                 // number of stitches to draw (playback)
  mode: 'file' | 'plan';
  showJumps: boolean;
  fabric: string;
  rulers: boolean;
  thread?: ThreadStyle;
  /** colour stops for variegated thread */
  stops?: string[];
  hoop?: { w: number; h: number };
}

export const THREAD_MM = 0.4;          // real embroidery thread is ~0.4 mm wide
export const RULER = 22;               // ruler thickness, px
const REALISTIC_MIN_PX = 3;            // thread must be at least this wide (px) to bother with shading
const REALISTIC_MAX_VISIBLE = 30000;
const TWIST_MIN_PX = 11;               // thread width (px) at which the twisted-ply detail turns on
const TWIST_MAX_VISIBLE = 5000;   // beyond this many on-screen stitches fall back to the fast path

type RGB = [number, number, number];
const toRgb = (hex: string): RGB => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mix = (c: RGB, t: RGB, k: number) => `rgb(${Math.round(c[0] + (t[0] - c[0]) * k)},${Math.round(c[1] + (t[1] - c[1]) * k)},${Math.round(c[2] + (t[2] - c[2]) * k)})`;
const darker = (c: RGB, k: number) => mix(c, [0, 0, 0], k);
const lighter = (c: RGB, k: number) => mix(c, [255, 255, 255], k);
const luminance = (hex: string) => { const [r, g, b] = toRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

interface Palette { edge: string; shade: string; base: string; lit: string; spec: string; glow: string; tint: string; rgb: RGB; ply: string[] }
const palCache = new Map<string, Palette>();
function palette(hex: string, st: ThreadStyle): Palette {
  const key = `${hex}|${st.sheen}|${st.metallic}`;
  let p = palCache.get(key);
  if (!p) {
    const c = toRgb(hex);
    const lift = 0.3 + 0.35 * st.sheen;                 // glossier thread => brighter highlight
    p = {
      edge: darker(c, 0.78),
      shade: darker(c, 0.4),
      base: hex,
      lit: lighter(c, 0.2 + 0.2 * st.sheen),
      spec: lighter(c, Math.min(0.95, 0.5 + lift * 0.6)),
      glow: `rgba(${c[0]},${c[1]},${c[2]},`,
      tint: st.metallic ? lighter([c[0] * 0.8 + 40, c[1] * 0.8 + 40, c[2] * 0.85 + 60], 0.45) : hex,
      rgb: c,
      // 8 shades of a twisted strand, from tucked-under (dark) to facing the light (bright)
      ply: Array.from({ length: 8 }, (_, i) => { const k = i / 7; return k < 0.45 ? darker(c, (0.45 - k) * 0.6) : lighter(c, (k - 0.45) * (0.3 + 0.55 * st.sheen)); }),
    };
    palCache.set(key, p);
  }
  return p;
}

// light comes from the top-left of the screen
const LX = -0.6, LY = -0.8;
const hash = (x: number, y: number) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };

/** One stitch as a glossy round thread: dark rim, bright specular, soft shadow, needle-hole ends. */
function drawThread(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, pal: Palette, st: ThreadStyle) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) return;
  const ux = dx / len, uy = dy / len;
  let nx = -uy, ny = ux;
  if (nx * LX + ny * LY < 0) { nx = -nx; ny = -ny; } // normal always faces the light => consistent shading
  const detail = w >= 6; // below this the extra passes are just noise
  const r = w / 2;

  // halo for glowing threads
  if (st.glow >= 0.1) {
    ctx.lineWidth = w * (1.3 + st.glow * 0.8); ctx.strokeStyle = pal.glow + (0.1 + st.glow * 0.35) + ')';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }

  // soft cast shadow, offset away from the light, plus a dark rim that separates neighbouring threads
  const sx = -LX * w * 0.22, sy = -LY * w * 0.22;
  ctx.lineWidth = w * 1.18; ctx.strokeStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath(); ctx.moveTo(x0 + sx, y0 + sy); ctx.lineTo(x1 + sx, y1 + sy); ctx.stroke();
  ctx.lineWidth = w * 1.1; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();

  // cylindrical body: dark far rim -> shade -> base -> lit -> specular -> base -> rim
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const g = ctx.createLinearGradient(mx - nx * r, my - ny * r, mx + nx * r, my + ny * r);
  const sheen = st.sheen;
  g.addColorStop(0, pal.edge);
  g.addColorStop(0.16, pal.shade);
  g.addColorStop(0.42, pal.base);
  g.addColorStop(0.6, pal.lit);
  if (sheen > 0.12) {
    const half = 0.05 + (1 - sheen) * 0.09;             // glossier => tighter highlight
    g.addColorStop(Math.max(0.62, 0.7 - half), pal.lit);
    g.addColorStop(0.7, pal.spec);
    g.addColorStop(Math.min(0.9, 0.7 + half), pal.lit);
  }
  g.addColorStop(0.86, pal.base);
  g.addColorStop(1, pal.edge);
  ctx.lineWidth = w; ctx.strokeStyle = g;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();

  if (!detail) return;

  // metallic foil: extra cool bands and sparkle
  if (st.metallic) {
    ctx.lineWidth = w * 0.12; ctx.strokeStyle = pal.tint; ctx.globalAlpha = 0.55;
    for (const k of [-0.28, 0.12]) { ctx.beginPath(); ctx.moveTo(x0 + nx * r * k, y0 + ny * r * k); ctx.lineTo(x1 + nx * r * k, y1 + ny * r * k); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const n = Math.max(1, Math.floor(len / (w * 1.4)));
    for (let i = 0; i < n; i++) {
      const hsh = hash(x0 + i, y0 + len), t = (i + hsh) / n, o = (hash(y0, x0 + i) - 0.5) * 1.2 * r;
      if (hsh > 0.5) { ctx.beginPath(); ctx.arc(x0 + dx * t + nx * o, y0 + dy * t + ny * o, Math.max(0.6, w * 0.05), 0, 6.2832); ctx.fill(); }
    }
  }

  // thin lengthwise highlight on the lit side, stopping short of the ends so the tube looks rounded
  if (sheen > 0.12 && len > w * 0.9) {
    const inset = w * 0.32, ox = nx * r * 0.34, oy = ny * r * 0.34;
    ctx.lineWidth = Math.max(1, w * 0.13); ctx.strokeStyle = `rgba(255,255,255,${0.16 + 0.5 * sheen})`;
    ctx.beginPath(); ctx.moveTo(x0 + ux * inset + ox, y0 + uy * inset + oy); ctx.lineTo(x1 - ux * inset + ox, y1 - uy * inset + oy); ctx.stroke();
  }

  // ply twist (smooth threads) or fibres (cotton)
  if (st.fuzz > 0.2) {
    ctx.lineWidth = Math.max(0.7, w * 0.035); ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.18 * st.fuzz})`;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const o = (hash(x0 * 3 + i, y0) - 0.5) * 1.7 * r, a = hash(i, x1) * len * 0.3, b2 = len - hash(i + 9, y1) * len * 0.3;
      ctx.moveTo(x0 + ux * a + nx * o, y0 + uy * a + ny * o); ctx.lineTo(x0 + ux * b2 + nx * (o + (hash(i, y0) - 0.5) * r * 0.4), y0 + uy * b2 + ny * (o + (hash(i, y0) - 0.5) * r * 0.4));
    }
    ctx.stroke();
  } else if (w >= 9 && len > w) {
    const step = w * 0.75, k = r * 0.9;
    ctx.lineWidth = Math.max(1, w * 0.05); ctx.strokeStyle = 'rgba(0,0,0,0.13)';
    ctx.beginPath();
    for (let t = step * 0.5; t < len - step * 0.3; t += step) {
      const cx = x0 + ux * t, cy = y0 + uy * t, sl = w * 0.26;
      ctx.moveTo(cx - nx * k - ux * sl, cy - ny * k - uy * sl); ctx.lineTo(cx + nx * k + ux * sl, cy + ny * k + uy * sl);
    }
    ctx.stroke();
  }
}

/**
 * Close-up thread drawn as a twisted rope: a pointed-tip body with cylindrical shading, overlaid with
 * diagonal crest/valley ridges (the lay of the plies). The ridges are one repeating linear gradient whose
 * axis is tilted against the thread, clipped to the body, so it costs a single fill per stitch.
 */
const LAY = -0.62;   // ridge tilt (radians): ply lay angle relative to the thread axis
function drawRope(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, pal: Palette, st: ThreadStyle) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  if (len < w * 0.4) return drawThread(ctx, x0, y0, x1, y1, w, pal, st);
  const ang = Math.atan2(dy, dx);
  const r = w / 2;
  const taper = Math.min(len / 2, w * 1.25);
  const plies = st.plies ?? 2;
  const period = w * (plies === 3 ? 0.7 : 0.95);               // distance between ridges, measured along the gradient axis
  const nx = -dy / len, ny = dx / len;
  const flip = nx * LX + ny * LY < 0;                           // keep the lit side consistent whatever the stitch direction

  const body = new Path2D();
  body.moveTo(0, 0);
  body.bezierCurveTo(taper * 0.12, -r * 0.85, taper * 0.55, -r, taper, -r);
  body.lineTo(len - taper, -r);
  body.bezierCurveTo(len - taper * 0.55, -r, len - taper * 0.12, -r * 0.85, len, 0);
  body.bezierCurveTo(len - taper * 0.12, r * 0.85, len - taper * 0.55, r, len - taper, r);
  body.lineTo(taper, r);
  body.bezierCurveTo(taper * 0.55, r, taper * 0.12, r * 0.85, 0, 0);
  body.closePath();

  if (st.glow >= 0.1) { // halo
    ctx.lineCap = 'round'; ctx.lineWidth = w * (1.3 + st.glow * 0.8); ctx.strokeStyle = pal.glow + (0.1 + st.glow * 0.35) + ')';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }

  ctx.save();
  // soft shadow away from the light, drawn from the same silhouette
  ctx.save();
  ctx.translate(x0 + -LX * w * 0.2, y0 + -LY * w * 0.2); ctx.rotate(ang); if (flip) ctx.scale(1, -1);
  ctx.fillStyle = 'rgba(20,20,30,0.2)'; ctx.fill(body);
  ctx.restore();

  ctx.translate(x0, y0); ctx.rotate(ang); if (flip) ctx.scale(1, -1);   // local x along the thread, +y toward the light
  ctx.clip(body);

  // cylinder: dark far flank -> body -> lit face -> specular -> soft rim
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, pal.shade); g.addColorStop(0.22, pal.base); g.addColorStop(0.46, pal.lit);
  g.addColorStop(0.64, pal.lit);
  if (st.sheen > 0.12) { g.addColorStop(0.72, pal.spec); g.addColorStop(0.82, pal.lit); }
  g.addColorStop(0.93, pal.base); g.addColorStop(1, pal.shade);
  ctx.fillStyle = g; ctx.fillRect(-1, -r - 1, len + 2, w + 2);

  // ridges: a repeating dark/light band pattern along an axis tilted by LAY
  const gx = Math.cos(LAY), gy = Math.sin(LAY);
  let tMin = Infinity, tMax = -Infinity;
  for (const [cx, cy] of [[0, -r], [len, -r], [0, r], [len, r]]) { const t = cx * gx + cy * gy; tMin = Math.min(tMin, t); tMax = Math.max(tMax, t); }
  const span = tMax - tMin;
  const n = Math.max(1, Math.ceil(span / period));
  const rg = ctx.createLinearGradient(tMin * gx, tMin * gy, (tMin + n * period) * gx, (tMin + n * period) * gy);
  const valley = st.fuzz > 0.2 ? 'rgba(0,0,0,0.26)' : 'rgba(0,0,0,0.17)';
  const crest = `rgba(255,255,255,${0.1 + 0.2 * Math.max(st.sheen, 0.3)})`;
  for (let i = 0; i < n; i++) {
    const o = i / n, u = 1 / n;
    rg.addColorStop(o, valley); rg.addColorStop(o + u * 0.3, 'rgba(0,0,0,0)'); rg.addColorStop(o + u * 0.62, crest); rg.addColorStop(Math.min(1, o + u * 0.92), 'rgba(0,0,0,0)');
  }
  rg.addColorStop(1, valley);
  ctx.fillStyle = rg; ctx.fillRect(-1, -r - 1, len + 2, w + 2);

  if (st.metallic) { // foil flecks
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const flecks = Math.max(1, Math.floor(len / (w * 1.1)));
    for (let i = 0; i < flecks; i++) if (hash(x0 + i, y0 + len) > 0.45) {
      ctx.beginPath(); ctx.arc((i + hash(y0, x0 + i)) / flecks * len, (hash(x0, y0 + i) - 0.5) * r * 1.4, Math.max(0.7, w * 0.04), 0, 6.2832); ctx.fill();
    }
  }
  if (st.fuzz > 0.2) { // stray fibres
    ctx.lineWidth = Math.max(0.7, w * 0.03); ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.2 * st.fuzz})`; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const yy = (hash(x0 + i, y0) - 0.5) * 1.8 * r; ctx.moveTo(hash(i, x1) * len * 0.3, yy); ctx.lineTo(len - hash(i + 7, y1) * len * 0.3, yy + (hash(i, y0) - 0.5) * r * 0.5); }
    ctx.stroke();
  }
  ctx.restore();
}

/** Needle penetration: a dark hole with a faint lit rim. */
function drawHole(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const r = Math.max(1, w * 0.13);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.arc(x - LX * r * 0.35, y - LY * r * 0.35, r * 1.15, 0, 6.2832); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
}

function niceStep(pxPerMm: number) {
  for (const s of [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200]) if (s * pxPerMm >= 70) return s;
  return 500;
}
const fmt = (v: number, step: number) => (step < 0.1 ? v.toFixed(2) : step < 1 ? v.toFixed(1) : String(Math.round(v * 100) / 100));

function drawGrid(ctx: CanvasRenderingContext2D, o: RenderOpts) {
  const { view: v, w, h } = o, step = niceStep(v.s);
  const dark = luminance(o.fabric) < 0.5;
  const minor = step / 5;
  if (minor * v.s >= 12) { // faint minor lines, like graph paper
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let mm = Math.ceil((-v.x / v.s) / minor) * minor; mm * v.s + v.x < w; mm += minor) { const x = Math.round(mm * v.s + v.x) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let mm = Math.ceil((-(h - v.y) / v.s) / minor) * minor; -mm * v.s + v.y > 0; mm += minor) { const y = Math.round(-mm * v.s + v.y) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  }
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let mm = Math.ceil((-v.x / v.s) / step) * step; mm * v.s + v.x < w; mm += step) { const x = Math.round(mm * v.s + v.x) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let mm = Math.ceil((-(h - v.y) / v.s) / step) * step; -mm * v.s + v.y > 0; mm += step) { const y = Math.round(-mm * v.s + v.y) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
}

function drawRulers(ctx: CanvasRenderingContext2D, o: RenderOpts) {
  const { view: v, w, h } = o, step = niceStep(v.s), minor = step / 5;
  ctx.save();
  ctx.fillStyle = 'rgba(247,248,252,0.96)';
  ctx.fillRect(0, 0, w, RULER); ctx.fillRect(0, 0, RULER, h);
  ctx.strokeStyle = '#c9ccd8'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, RULER + 0.5); ctx.lineTo(w, RULER + 0.5); ctx.moveTo(RULER + 0.5, 0); ctx.lineTo(RULER + 0.5, h); ctx.stroke();
  ctx.fillStyle = '#2b2f3c'; ctx.strokeStyle = '#5b6070';
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';

  const showMinor = minor * v.s >= 7;
  // top ruler (x)
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const x0 = Math.floor((RULER - v.x) / v.s / minor) * minor;
  for (let mm = x0; mm * v.s + v.x < w; mm += minor) {
    const x = Math.round(mm * v.s + v.x) + 0.5;
    if (x < RULER) continue;
    const major = Math.abs(mm / step - Math.round(mm / step)) < 1e-6;
    if (!major && !showMinor) continue;
    ctx.beginPath(); ctx.moveTo(x, RULER); ctx.lineTo(x, RULER - (major ? 9 : 4)); ctx.stroke();
    if (major) ctx.fillText(fmt(mm, step), x, 2);
  }
  // left ruler (y, up is positive)
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const yTop = (v.y - RULER) / v.s;
  const y0 = Math.ceil(yTop / minor) * minor;
  for (let mm = y0; -mm * v.s + v.y < h; mm -= minor) {
    const y = Math.round(-mm * v.s + v.y) + 0.5;
    if (y < RULER) continue;
    const major = Math.abs(mm / step - Math.round(mm / step)) < 1e-6;
    if (!major && !showMinor) continue;
    ctx.beginPath(); ctx.moveTo(RULER, y); ctx.lineTo(RULER - (major ? 9 : 4), y); ctx.stroke();
    if (major) { ctx.save(); ctx.translate(11, y); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText(fmt(mm, step), 0, 0); ctx.restore(); }
  }
  ctx.restore();
}

function stopColor(stops: string[], t: number) {
  const f = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1), i = Math.floor(f), k = f - i;
  const a = toRgb(stops[i]), b = toRgb(stops[i + 1]);
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${h(a[0] + (b[0] - a[0]) * k)}${h(a[1] + (b[1] - a[1]) * k)}${h(a[2] + (b[2] - a[2]) * k)}`;
}

/** Draws the whole scene. Returns whether the shaded thread renderer was used. */
export function renderScene(o: RenderOpts): { realistic: boolean } {
  const { ctx, w, h, dpr, view: v, blocks, colors, hidden, limit, mode } = o;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = o.fabric; ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, o);

  const px = (x: number) => x * v.s + v.x, py = (y: number) => -y * v.s + v.y;
  const style = o.thread ?? DEFAULT_STYLE;
  // threads are drawn a touch plumper than their nominal width: real stitches swell and overlap in dense fills
  const thread = Math.max(0.7, style.widthMm * 1.15 * v.s);

  if (o.hoop) { // the hoop: dim everything outside it and outline the sewing field
    const hx0 = px(-o.hoop.w / 2), hx1 = px(o.hoop.w / 2), hy0 = py(o.hoop.h / 2), hy1 = py(-o.hoop.h / 2);
    ctx.save();
    ctx.fillStyle = 'rgba(15,23,42,0.07)';
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.rect(hx0, hy0, hx1 - hx0, hy1 - hy0); ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(99,102,241,0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([7, 5]);
    ctx.strokeRect(hx0, hy0, hx1 - hx0, hy1 - hy0);
    ctx.setLineDash([]); ctx.fillStyle = 'rgba(99,102,241,0.9)'; ctx.font = '600 10px ui-monospace, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`HOOP ${o.hoop.w} × ${o.hoop.h} mm`, hx0 + 6, hy0 + 5);
    ctx.restore();
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // Collect on-screen segments (viewport culling) so cost depends on what you see, not file size
  type Seg = [number, number, number, number, 0 | 1 | 2, number]; // ..., global stitch index
  const margin = thread * 2 + 4;
  const visible: Seg[][] = [];
  let visCount = 0, drawn = 0;
  const totalStitches = blocks.reduce((n, b) => n + b.stitches.length, 0) || 1;
  let lastPt: [number, number] | null = null;
  for (let bi = 0; bi < blocks.length; bi++) {
    const segs: Seg[] = [];
    if (drawn < limit) {
      const pts = blocks[bi].stitches.slice(0, limit - drawn);
      for (let i = 1; i < pts.length; i++) {
        const ax = px(pts[i - 1][0]), ay = py(pts[i - 1][1]), bx = px(pts[i][0]), by = py(pts[i][1]);
        if ((ax < -margin && bx < -margin) || (ax > w + margin && bx > w + margin) || (ay < -margin && by < -margin) || (ay > h + margin && by > h + margin)) continue;
        segs.push([ax, ay, bx, by, pts[i][2], drawn + i]);
        if (pts[i][2] === 0) visCount++;
      }
      if (pts.length) lastPt = [pts[pts.length - 1][0], pts[pts.length - 1][1]];
      drawn += pts.length;
    }
    visible.push(segs);
  }

  const realistic = mode === 'file' && thread >= REALISTIC_MIN_PX && visCount <= REALISTIC_MAX_VISIBLE;
  // plied-rope detail only when threads are big enough to show it and few enough to draw quickly
  const twisted = realistic && thread >= TWIST_MIN_PX && visCount <= TWIST_MAX_VISIBLE;

  for (let bi = 0; bi < visible.length; bi++) {
    const segs = visible[bi];
    if (!segs.length) continue;
    const col = colors[bi];
    if (!hidden.has(bi)) {
      if (realistic) {
        const stops = o.stops && o.stops.length > 1 ? o.stops : null;
        const fixed = style.variegated && stops ? null : palette(col, style);
        for (const [ax, ay, bx, by, code, gi] of segs) {
          if (code !== 0) continue;
          let pal = fixed;
          if (!pal) pal = palette(stopColor(stops!, Math.round((gi / totalStitches) * 47) / 47), style); // variegated: colour drifts along the thread
          if (twisted) {
            drawRope(ctx, ax, ay, bx, by, thread, pal, style);
          } else {
            drawThread(ctx, ax, ay, bx, by, thread, pal, style);
            if (thread >= 7) { drawHole(ctx, ax, ay, thread); drawHole(ctx, bx, by, thread); } // later stitches cover earlier holes
          }
        }
      } else {
        const line = new Path2D();
        for (const [ax, ay, bx, by, code] of segs) if (code === 0) { line.moveTo(ax, ay); line.lineTo(bx, by); }
        if (mode === 'plan') {
          ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, Math.min(2, thread)); ctx.stroke(line);
          if (v.s >= 8) { // needle points
            ctx.fillStyle = col;
            for (const [ax, ay, bx, by, code] of segs) if (code === 0) {
              ctx.fillRect(ax - 1.5, ay - 1.5, 3, 3); ctx.fillRect(bx - 1.5, by - 1.5, 3, 3);
            }
          }
        } else { // fast path: flat thread with a thin highlight
          ctx.strokeStyle = col; ctx.lineWidth = thread; ctx.stroke(line);
          ctx.strokeStyle = lighter(toRgb(col), 0.55); ctx.globalAlpha = 0.35; ctx.lineWidth = thread * 0.35; ctx.stroke(line);
          ctx.globalAlpha = 1;
        }
      }
    }
    if (o.showJumps || mode === 'plan') {
      const travel = new Path2D();
      for (const [ax, ay, bx, by, code] of segs) if (code !== 0) { travel.moveTo(ax, ay); travel.lineTo(bx, by); }
      ctx.strokeStyle = mode === 'plan' ? 'rgba(239,68,68,0.75)' : '#ef4444'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.stroke(travel); ctx.setLineDash([]);
    }
  }

  if (mode === 'plan' && blocks[0]?.stitches.length) { // start / end markers
    const s0 = blocks[0].stitches[0];
    const lb = blocks[blocks.length - 1].stitches;
    const e0 = lb[lb.length - 1];
    for (const [pt, col, label] of [[s0, '#16a34a', 'S'], [e0, '#dc2626', 'E']] as const) {
      ctx.beginPath(); ctx.arc(px(pt[0]), py(pt[1]), 7, 0, 6.2832); ctx.fillStyle = col; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, px(pt[0]), py(pt[1]) + 0.5);
    }
  }

  if (limit < blocks.reduce((n, b) => n + b.stitches.length, 0) && lastPt) { // needle while scrubbing
    ctx.beginPath(); ctx.arc(px(lastPt[0]), py(lastPt[1]), 5, 0, 6.2832);
    ctx.fillStyle = '#facc15'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  if (o.rulers) drawRulers(ctx, o);
  return { realistic };
}
