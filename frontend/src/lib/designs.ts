// Built-in design library. Everything is drawn procedurally on a canvas, so there is no third-party artwork
// to license: each design is turned into a PNG File and fed to the same digitizer as an uploaded image.

export interface Design { id: string; name: string; tag: string; draw: (g: CanvasRenderingContext2D, w: number, h: number) => void }

const W = 640, H = 480;
const star = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number, r: number, rot = -Math.PI / 2, pts = 5) => {
  g.beginPath();
  for (let i = 0; i < pts * 2; i++) { const a = rot + (i * Math.PI) / pts, d = i % 2 ? r : R; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * d, cy + Math.sin(a) * d); }
  g.closePath();
};
const ellipse = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };

export const DESIGNS: Design[] = [
  { id: 'wing-star', name: 'Winged star', tag: 'Emblem', draw: (g, w, h) => {
    g.fillStyle = '#c8102e';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w / 2 + s * 40, 190); g.lineTo(w / 2 + s * 290, 150); g.lineTo(w / 2 + s * 250, 205); g.lineTo(w / 2 + s * 40, 235); g.fill();
      g.beginPath(); g.moveTo(w / 2 + s * 40, 250); g.lineTo(w / 2 + s * 240, 225); g.lineTo(w / 2 + s * 205, 275); g.lineTo(w / 2 + s * 40, 290); g.fill(); }
    g.fillStyle = '#14284b'; star(g, w / 2, 245, 170, 70); g.fill();
    g.fillStyle = '#fff'; ellipse(g, w / 2, 250, 36, 36); g.fill();
  } },
  { id: 'heart', name: 'Heart', tag: 'Shape', draw: (g, w, h) => {
    const heart = (cx: number, cy: number, s: number) => { g.beginPath(); g.moveTo(cx, cy + s * 0.9); g.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.9, cy - s * 1.2, cx, cy - s * 0.45); g.bezierCurveTo(cx + s * 0.9, cy - s * 1.2, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9); g.closePath(); };
    g.fillStyle = '#d6204f'; heart(w / 2, 230, 170); g.fill();
    g.fillStyle = '#ffffff'; heart(w / 2 - 20, 180, 50); g.fill();
    g.fillStyle = '#f7a8bd'; heart(w - 110, 110, 36); g.fill(); heart(110, 360, 30); g.fill();
  } },
  { id: 'floral', name: 'Flower', tag: 'Floral', draw: (g, w, h) => {
    g.fillStyle = '#2f9e44';
    for (const [x, y, a] of [[w / 2 - 120, 380, -0.9], [w / 2 + 120, 380, 0.9]] as const) { ellipse(g, x, y, 90, 34, a); g.fill(); }
    g.fillRect(w / 2 - 7, 280, 14, 160);
    g.fillStyle = '#e0278c';
    for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; ellipse(g, w / 2 + Math.cos(a) * 78, 190 + Math.sin(a) * 78, 66, 38, a); g.fill(); }
    g.fillStyle = '#f5c518'; ellipse(g, w / 2, 190, 42, 42); g.fill();
  } },
  { id: 'monogram', name: 'Monogram ring', tag: 'Lettering', draw: (g, w, h) => {
    g.strokeStyle = '#c9a227'; g.lineWidth = 22; ellipse(g, w / 2, h / 2, 190, 190); g.stroke();
    g.fillStyle = '#14284b'; g.font = 'bold 300px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('A', w / 2, h / 2 + 18);
  } },
  { id: 'paw', name: 'Paw print', tag: 'Animals', draw: (g, w, h) => {
    g.fillStyle = '#3e2a1f';
    ellipse(g, w / 2, 300, 120, 96); g.fill();
    for (const [x, y, r] of [[-130, 170, -0.4], [-45, 110, -0.1], [45, 110, 0.1], [130, 170, 0.4]] as const) { ellipse(g, w / 2 + x, y + 40, 40, 58, r); g.fill(); }
  } },
  { id: 'crest', name: 'Crest', tag: 'Emblem', draw: (g, w, h) => {
    g.fillStyle = '#14284b'; g.beginPath(); g.moveTo(w / 2 - 170, 70); g.lineTo(w / 2 + 170, 70); g.lineTo(w / 2 + 170, 260); g.quadraticCurveTo(w / 2 + 170, 390, w / 2, 440); g.quadraticCurveTo(w / 2 - 170, 390, w / 2 - 170, 260); g.closePath(); g.fill();
    g.fillStyle = '#c9a227'; star(g, w / 2, 215, 90, 38); g.fill();
    g.fillStyle = '#c8102e'; g.fillRect(w / 2 - 170, 70, 340, 40);
  } },
  { id: 'sunrise', name: 'Sunrise', tag: 'Scenery', draw: (g, w, h) => {
    g.fillStyle = '#f58220'; ellipse(g, w / 2, 230, 120, 120); g.fill();
    g.fillStyle = '#0f8a8a'; g.beginPath(); g.moveTo(40, 420); g.lineTo(210, 220); g.lineTo(330, 340); g.lineTo(440, 250); g.lineTo(w - 40, 420); g.closePath(); g.fill();
    g.fillStyle = '#14284b'; g.beginPath(); g.moveTo(150, 420); g.lineTo(280, 300); g.lineTo(400, 420); g.closePath(); g.fill();
  } },
  { id: 'wreath', name: 'Leaf wreath', tag: 'Floral', draw: (g, w, h) => {
    g.fillStyle = '#2f9e44';
    for (let i = 0; i < 14; i++) { const a = (i * Math.PI * 2) / 14; ellipse(g, w / 2 + Math.cos(a) * 160, h / 2 + Math.sin(a) * 160, 56, 22, a + Math.PI / 2.6); g.fill(); }
    g.fillStyle = '#d6204f'; for (let i = 0; i < 7; i++) { const a = (i * Math.PI * 2) / 7 + 0.2; ellipse(g, w / 2 + Math.cos(a) * 160, h / 2 + Math.sin(a) * 160, 20, 20); g.fill(); }
  } },
];

export const LETTERING_FONTS = [
  { id: 'sans', label: 'Bold Sans', css: 'bold 220px Arial, Helvetica, sans-serif' },
  { id: 'serif', label: 'Serif Bold', css: 'bold 220px Georgia, "Times New Roman", serif' },
  { id: 'script', label: 'Script', css: 'italic bold 230px "Brush Script MT", "Segoe Script", cursive' },
  { id: 'mono', label: 'Typewriter', css: 'bold 210px "Courier New", Courier, monospace' },
];

const toFile = (canvas: HTMLCanvasElement, name: string) =>
  new Promise<File>((resolve, reject) => canvas.toBlob(b => (b ? resolve(new File([b], `${name}.png`, { type: 'image/png' })) : reject(new Error('Could not render design'))), 'image/png'));

function blank(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  return { c, g };
}

/** Draw a design thumbnail straight onto a canvas element (no intermediate state needed). */
export function drawDesignThumb(d: Design, target: HTMLCanvasElement) {
  const { c, g } = blank(W, H); d.draw(g, W, H);
  target.getContext('2d')!.drawImage(c, 0, 0, target.width, target.height);
}

export async function designFile(d: Design): Promise<File> {
  const { c, g } = blank(W, H); d.draw(g, W, H);
  return toFile(c, d.id);
}

/** Type some text, get artwork sized to fit it. */
export async function letteringFile(text: string, fontId: string, color: string): Promise<File> {
  const font = LETTERING_FONTS.find(f => f.id === fontId) ?? LETTERING_FONTS[0];
  const label = text.trim().slice(0, 14) || 'Hello';
  const probe = document.createElement('canvas').getContext('2d')!; probe.font = font.css;
  const tw = Math.ceil(probe.measureText(label).width);
  const { c, g } = blank(tw + 120, 340);
  g.fillStyle = color; g.font = font.css; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, c.width / 2, c.height / 2 + 10);
  return toFile(c, `lettering-${label.replace(/\W+/g, '_').toLowerCase()}`);
}
