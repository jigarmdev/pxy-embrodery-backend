// @ts-nocheck

const wrap = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${body}</svg>`;

// Built-in clip-art (single-colour, recolourable)
export const CLIPART = [
  { id: 'star', name: 'Star', svg: wrap('<polygon fill="#111" points="50,6 61,38 95,38 67,58 78,92 50,71 22,92 33,58 5,38 39,38"/>') },
  { id: 'heart', name: 'Heart', svg: wrap('<path fill="#111" d="M50 90 C10 60 2 35 20 18 C33 6 46 14 50 26 C54 14 67 6 80 18 C98 35 90 60 50 90Z"/>') },
  { id: 'circle', name: 'Circle', svg: wrap('<circle cx="50" cy="50" r="44" fill="#111"/>') },
  { id: 'ring', name: 'Ring', svg: wrap('<circle cx="50" cy="50" r="40" fill="none" stroke="#111" stroke-width="12"/>') },
  { id: 'square', name: 'Square', svg: wrap('<rect x="8" y="8" width="84" height="84" rx="8" fill="#111"/>') },
  { id: 'triangle', name: 'Triangle', svg: wrap('<polygon fill="#111" points="50,8 94,90 6,90"/>') },
  { id: 'diamond', name: 'Diamond', svg: wrap('<polygon fill="#111" points="50,4 94,50 50,96 6,50"/>') },
  { id: 'crown', name: 'Crown', svg: wrap('<path fill="#111" d="M8 78 L14 30 L34 52 L50 18 L66 52 L86 30 L92 78Z"/><rect x="8" y="82" width="84" height="10" fill="#111"/>') },
  { id: 'bolt', name: 'Bolt', svg: wrap('<polygon fill="#111" points="58,4 20,56 46,56 38,96 80,40 54,40"/>') },
  { id: 'arrow', name: 'Arrow', svg: wrap('<polygon fill="#111" points="4,38 60,38 60,18 96,50 60,82 60,62 4,62"/>') },
  { id: 'check', name: 'Check', svg: wrap('<polyline points="12,54 38,80 90,22" fill="none" stroke="#111" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>') },
  { id: 'billiard', name: '8-Ball', svg: wrap('<circle cx="50" cy="50" r="46" fill="#111"/><circle cx="50" cy="50" r="22" fill="#fff"/><text x="50" y="60" font-size="30" font-family="Arial" font-weight="bold" text-anchor="middle" fill="#111">8</text>') },
];

export const svgDataUrl = (svg) => 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

const MAX_SVG_BYTES = 1.5 * 1024 * 1024;
const BLOCKED = ['script', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video', 'a', 'animate', 'set', 'animatetransform', 'animatemotion'];

// Strip anything executable or external from an uploaded SVG. Throws if it is not a usable SVG.
export function sanitizeSvg(text) {
  if (!text || text.length > MAX_SVG_BYTES) throw new Error('SVG is empty or larger than 1.5 MB');
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
    throw new Error('Not a valid SVG file');
  }

  const all = [root, ...root.querySelectorAll('*')];
  all.forEach((el) => {
    if (el !== root && BLOCKED.includes(el.nodeName.toLowerCase())) { el.remove(); return; }
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim();
      if (name.startsWith('on')) { el.removeAttribute(attr.name); return; }
      if ((name === 'href' || name === 'xlink:href') && !(val.startsWith('#') || /^data:image\/(png|jpe?g|gif|webp);/i.test(val))) {
        el.removeAttribute(attr.name);
        return;
      }
      if (name === 'style' || name === 'fill' || name === 'stroke' || name === 'filter' || name === 'clip-path' || name === 'mask') {
        if (/url\(\s*['"]?(?!#)/i.test(val) || /javascript:/i.test(val)) el.removeAttribute(attr.name);
      }
    });
    if (el.nodeName.toLowerCase() === 'style') {
      el.textContent = el.textContent.replace(/@import[^;]*;?/gi, '').replace(/url\(\s*['"]?(?!#)[^)]*\)/gi, 'none');
    }
  });
  return new XMLSerializer().serializeToString(root);
}
