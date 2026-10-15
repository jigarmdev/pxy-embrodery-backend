// Client-side upload preparation: SVG logos are rasterised on a transparent background and oversized images
// are shrunk, so the backend always receives a reasonably sized PNG/JPG/WEBP.

export const MAX_UPLOAD_PX = 1200;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ACCEPT = 'image/png, image/jpeg, image/webp, image/svg+xml, .svg';

const isSvg = (f: File) => f.type === 'image/svg+xml' || /\.svg$/i.test(f.name);

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file could not be opened as an image'));
    img.src = url;
  });
}

function toPngFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(new File([b], name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' })) : reject(new Error('Could not process the image'))), 'image/png'));
}

/** Validate, rasterise SVG, and downscale large images. Throws an Error with a readable message. */
export async function prepareUpload(file: File): Promise<File> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`Image is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    // SVGs without a size report 0: give them a sensible one so they rasterise
    const nw = img.naturalWidth || 1000, nh = img.naturalHeight || 1000;
    const scale = Math.min(1, MAX_UPLOAD_PX / Math.max(nw, nh));
    if (!isSvg(file) && scale === 1) return file;           // already fine: send the original bytes
    const w = Math.max(1, Math.round(nw * (isSvg(file) ? Math.min(MAX_UPLOAD_PX / Math.max(nw, nh), 4) : scale)));
    const h = Math.max(1, Math.round(nh * (isSvg(file) ? Math.min(MAX_UPLOAD_PX / Math.max(nw, nh), 4) : scale)));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(img, 0, 0, w, h);          // transparent where the SVG / PNG is transparent
    return await toPngFile(c, file.name);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Crop a File to a rectangle given in fractions of the image (0..1). */
export async function cropFile(file: File, box: { x: number; y: number; w: number; h: number }): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const sx = Math.round(box.x * img.naturalWidth), sy = Math.round(box.y * img.naturalHeight);
    const sw = Math.max(1, Math.round(box.w * img.naturalWidth)), sh = Math.max(1, Math.round(box.h * img.naturalHeight));
    const c = document.createElement('canvas'); c.width = sw; c.height = sh;
    c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return await toPngFile(c, file.name);
  } finally {
    URL.revokeObjectURL(url);
  }
}
