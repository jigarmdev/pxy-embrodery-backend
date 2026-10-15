// @ts-nocheck
import * as fabric from 'fabric';

export const ART_SIZE = 1024;
const HISTORY_LIMIT = 20;

// mesh uuid -> entry. A group design is ONE entry shared by every mesh in that group.
// entry = { canvas, texture, w, h, kind: 'mesh' | 'group', axis, material, version,
//           targets: [{ mesh, originalMap, originalColor, originalUv }], history }
const entries = new Map();

const listeners = new Set();
export const subscribeArtwork = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = () => listeners.forEach(fn => fn());

export const getArtwork = (mesh) => (mesh ? entries.get(mesh.uuid) : undefined);
export const hasArtwork = (mesh) => !!getArtwork(mesh);

const fitSize = (aspect, max) => {
  const a = Math.min(Math.max(aspect || 1, 0.1), 10);
  return a >= 1 ? [max, Math.max(64, Math.round(max / a))] : [Math.max(64, Math.round(max * a)), max];
};

/* ---------------- history (undo / redo) ---------------- */

const snapshot = (e) => JSON.stringify({ json: e.canvas.toJSON(), material: e.material });

export function pushHistory(e) {
  const h = e.history;
  if (h.busy) return;
  const s = snapshot(e);
  if (h.stack[h.i] === s) return;
  h.stack.splice(h.i + 1);
  h.stack.push(s);
  if (h.stack.length > HISTORY_LIMIT) h.stack.shift();
  h.i = h.stack.length - 1;
  e.version++;
  notify();
}

async function loadState(e, json) {
  e.history.busy = true;
  try {
    await e.canvas.loadFromJSON(json);
  } finally {
    e.history.busy = false;
  }
  e.canvas.requestRenderAll();
}

function resetHistory(e) {
  e.history.stack = [];
  e.history.i = -1;
  pushHistory(e);
}

async function gotoHistory(e, i) {
  const h = e.history;
  if (i < 0 || i >= h.stack.length) return;
  const s = JSON.parse(h.stack[i]);
  h.busy = true;
  try { await e.canvas.loadFromJSON(s.json); } finally { h.busy = false; }
  e.material = s.material;
  h.i = i;
  e.version++;
  e.canvas.requestRenderAll();
  notify();
}

export const commitArtwork = (mesh) => { const e = getArtwork(mesh); if (e) pushHistory(e); };
export const undoArtwork = (mesh) => { const e = getArtwork(mesh); return e && gotoHistory(e, e.history.i - 1); };
export const redoArtwork = (mesh) => { const e = getArtwork(mesh); return e && gotoHistory(e, e.history.i + 1); };
export const canUndo = (mesh) => { const e = getArtwork(mesh); return !!e && e.history.i > 0; };
export const canRedo = (mesh) => { const e = getArtwork(mesh); return !!e && e.history.i < e.history.stack.length - 1; };

/* ---------------- entry creation ---------------- */

function createEntry(THREE, meshes, { w, h, kind, axis = null, transparent = false, flipY, baseColor = '#ffffff' }) {
  const el = document.createElement('canvas');
  const canvas = new fabric.Canvas(el, {
    width: w,
    height: h,
    backgroundColor: transparent ? '' : baseColor,
    preserveObjectStacking: true,
    enableRetinaScaling: false, // texture size == canvas size
  });
  const texture = new THREE.CanvasTexture(canvas.lowerCanvasEl);
  texture.flipY = flipY;
  texture.anisotropy = 8;
  canvas.on('after:render', () => { texture.needsUpdate = true; });

  const entry = {
    canvas, texture, w, h, kind, axis, material: null, version: 0, targets: [],
    history: { stack: [], i: -1, busy: false },
  };
  meshes.forEach((m) => {
    const mat = m.material;
    entry.targets.push({
      mesh: m,
      originalMap: mat.map || null,
      originalColor: mat.color ? mat.color.getHex() : 0xffffff,
      originalUv: null,
    });
    entries.set(m.uuid, entry);
    mat.map = texture;
    if (mat.color) mat.color.set(0xffffff);
    mat.needsUpdate = true;
  });

  ['object:added', 'object:removed', 'object:modified', 'text:editing:exited']
    .forEach(ev => canvas.on(ev, () => pushHistory(entry)));
  pushHistory(entry);
  return entry;
}

// Single-mesh design: the canvas maps through the mesh's own UVs.
export function ensureArtwork(THREE, mesh, opts = {}) {
  const existing = entries.get(mesh.uuid);
  if (existing) return existing;
  const mat = mesh.material;
  const baseColor = mat.color ? '#' + mat.color.getHexString() : '#ffffff';
  const size = opts.size || ART_SIZE;
  return createEntry(THREE, [mesh], {
    w: size, h: size, kind: 'mesh', transparent: !!opts.transparent,
    flipY: !mesh.userData.fromGLTF, // glTF UVs expect flipY = false
    baseColor,
  });
}

/* ---------------- group design (planar-projected UVs) ---------------- */

export const GROUP_AXES = [
  { id: 'front', label: 'Front (Z)' },
  { id: 'side', label: 'Side (X)' },
  { id: 'top', label: 'Top (Y)' },
];

function projectUv(THREE, mesh, box, axis) {
  mesh.geometry = mesh.geometry.clone(); // geometry may be shared with other nodes
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const old = geo.attributes.uv;
  let originalUv = null;
  if (old) {
    originalUv = new Float32Array(old.count * 2);
    for (let i = 0; i < old.count; i++) { originalUv[2 * i] = old.getX(i); originalUv[2 * i + 1] = old.getY(i); }
  }
  const size = box.getSize(new THREE.Vector3());
  const d = (n) => Math.max(n, 1e-6);
  const uv = new Float32Array(pos.count * 2);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    let u, w;
    if (axis === 'side') { u = (box.max.z - v.z) / d(size.z); w = (v.y - box.min.y) / d(size.y); }
    else if (axis === 'top') { u = (v.x - box.min.x) / d(size.x); w = (box.max.z - v.z) / d(size.z); }
    else { u = (v.x - box.min.x) / d(size.x); w = (v.y - box.min.y) / d(size.y); }
    uv[2 * i] = u;
    uv[2 * i + 1] = w;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return originalUv;
}

export function ensureGroupArtwork(THREE, meshes, axis = 'front') {
  const existing = entries.get(meshes[0].uuid);
  if (existing) return existing;

  meshes.forEach(m => m.updateWorldMatrix(true, false));
  const box = new THREE.Box3();
  meshes.forEach(m => box.expandByObject(m));
  const s = box.getSize(new THREE.Vector3());
  const [a, b] = axis === 'side' ? [s.z, s.y] : axis === 'top' ? [s.x, s.z] : [s.x, s.y];
  const [w, h] = fitSize(a / Math.max(b, 1e-6), ART_SIZE);

  const entry = createEntry(THREE, meshes, { w, h, kind: 'group', axis, flipY: true });
  entry.targets.forEach(t => { t.originalUv = projectUv(THREE, t.mesh, box, axis); });
  return entry;
}

/* ---------------- editing helpers ---------------- */

// Flat colour base layer (clears any material image)
export function setArtworkBase(mesh, color) {
  const e = getArtwork(mesh);
  if (!e) return;
  e.material = null;
  e.canvas.backgroundColor = color;
  e.canvas.requestRenderAll();
  pushHistory(e);
}

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = url;
});

// Material image as a tiled base layer under all artwork. `tiles` = repeats across the canvas width.
export async function setArtworkMaterial(mesh, url, tiles = 3, record = true) {
  const e = getArtwork(mesh);
  if (!e) return;
  const img = await loadImage(url);
  const w = img.naturalWidth || img.width || 256;
  const s = e.w / tiles / w;
  e.canvas.backgroundColor = new fabric.Pattern({
    source: img,
    repeat: 'repeat',
    patternTransform: [s, 0, 0, s, 0, 0],
  });
  e.material = { url, tiles };
  e.canvas.requestRenderAll();
  if (record) pushHistory(e);
}

export const getArtworkMaterial = (mesh) => getArtwork(mesh)?.material || null;

export function removeArtwork(mesh) {
  const e = getArtwork(mesh);
  if (!e) return;
  const THREE = window.THREE;
  e.targets.forEach((t) => {
    const mat = t.mesh.material;
    mat.map = t.originalMap;
    if (mat.color) mat.color.setHex(t.originalColor);
    mat.needsUpdate = true;
    if (e.kind === 'group') {
      if (t.originalUv) t.mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(t.originalUv, 2));
      else t.mesh.geometry.deleteAttribute('uv');
    }
    entries.delete(t.mesh.uuid);
  });
  e.texture.dispose();
  e.canvas.dispose();
  notify();
}

// UV wireframe segments (0..1) used as an editor guide only.
export function getUvSegments(mesh, maxTris = 6000) {
  const geo = mesh.geometry;
  const uv = geo && geo.attributes && geo.attributes.uv;
  if (!uv) return null;
  const idx = geo.index;
  const triCount = (idx ? idx.count : uv.count) / 3;
  const step = Math.max(1, Math.ceil(triCount / maxTris));
  const segs = [];
  for (let t = 0; t < triCount; t += step) {
    const i = [0, 1, 2].map(k => (idx ? idx.getX(t * 3 + k) : t * 3 + k));
    for (let k = 0; k < 3; k++) {
      const a = i[k], b = i[(k + 1) % 3];
      segs.push([uv.getX(a), uv.getY(a), uv.getX(b), uv.getY(b)]);
    }
  }
  return segs;
}

// Is the design opaque at this UV? (lets clicks pass through empty parts of a decal)
export function isOpaqueAt(mesh, uv) {
  const e = getArtwork(mesh);
  if (!e || !uv) return true;
  try {
    const x = Math.min(e.w - 1, Math.max(0, Math.floor(uv.x * e.w)));
    const y = Math.min(e.h - 1, Math.max(0, Math.floor((e.texture.flipY ? 1 - uv.y : uv.y) * e.h)));
    return e.canvas.lowerCanvasEl.getContext('2d').getImageData(x, y, 1, 1).data[3] > 16;
  } catch (err) {
    return true;
  }
}

/* ---------------- persistence ---------------- */

// Meshes are matched across a glTF export/import by userData.artId (glTF keeps it as "extras").
// Index paths are not reliable: the exporter/loader can reshuffle sibling order.
function allMeshes(root) {
  const out = [];
  root.traverse(c => { if (c.isMesh) out.push(c); });
  return out;
}

// Legacy saves keyed artwork by child-index path
function meshPaths(root) {
  const out = [];
  const walk = (o, path) => o.children.forEach((c, i) => {
    const p = [...path, i];
    if (c.isMesh) out.push([p.join('/'), c]);
    walk(c, p);
  });
  walk(root, []);
  return out;
}

export function serializeArtwork(root) {
  const meshes = {};
  const groups = [];
  const seen = new Set();
  const tag = (m) => { m.userData.artId = m.uuid; return m.uuid; }; // fresh id: clones copy userData
  allMeshes(root).forEach((m) => {
    const e = entries.get(m.uuid);
    if (!e || seen.has(e)) return;
    seen.add(e);
    const base = { json: e.canvas.toJSON(), material: e.material || null, w: e.w, h: e.h };
    if (e.kind === 'group') {
      groups.push({
        ...base,
        axis: e.axis,
        ids: e.targets.map(t => tag(t.mesh)),
        targets: e.targets.map(t => ({ originalColor: t.originalColor, originalUv: t.originalUv })),
      });
    } else {
      meshes[tag(m)] = { ...base, originalColor: e.targets[0].originalColor };
    }
  });
  return { meshes, groups };
}

export async function restoreArtwork(THREE, root, data) {
  const byId = new Map();
  allMeshes(root).forEach(m => { if (m.userData.artId) byId.set(m.userData.artId, m); });
  const byPath = new Map(meshPaths(root));
  // Older saves were a flat { path: record } map
  const isNew = data && (data.meshes || data.groups);
  const meshData = isNew ? (data.meshes || {}) : (data || {});
  const groupData = isNew ? (data.groups || []) : [];
  const find = (k) => byId.get(k) || byPath.get(k);

  for (const [key, d] of Object.entries(meshData)) {
    const m = find(key);
    if (!m || !m.geometry?.attributes?.uv) continue;
    m.material.map = null; // drop the baked texture from the glTF; the canvas replaces it
    const e = createEntry(THREE, [m], {
      w: d.w || ART_SIZE, h: d.h || ART_SIZE, kind: 'mesh', flipY: !m.userData.fromGLTF,
    });
    e.targets[0].originalColor = d.originalColor;
    await loadState(e, d.json);
    if (d.material) await setArtworkMaterial(m, d.material.url, d.material.tiles, false).catch(() => {});
    resetHistory(e);
  }

  for (const d of groupData) {
    const meshes = (d.ids || []).map(find);
    if (!meshes.length || meshes.some(m => !m)) continue;
    meshes.forEach(m => { m.material.map = null; });
    const e = createEntry(THREE, meshes, { w: d.w, h: d.h, kind: 'group', axis: d.axis, flipY: true });
    e.targets.forEach((t, i) => {
      t.originalColor = d.targets[i].originalColor;
      t.originalUv = d.targets[i].originalUv || null;
    });
    await loadState(e, d.json);
    if (d.material) await setArtworkMaterial(meshes[0], d.material.url, d.material.tiles, false).catch(() => {});
    resetHistory(e);
  }
}

// Independent copies of every design that touches srcMeshes (dstMeshes[i] is the clone of srcMeshes[i]).
export function cloneArtworkSet(THREE, srcMeshes, dstMeshes) {
  const done = new Set();
  const jobs = [];
  srcMeshes.forEach((s) => {
    const e = getArtwork(s);
    if (!e || done.has(e)) return;
    done.add(e);
    const idx = srcMeshes.map((m, k) => k).filter(k => entries.get(srcMeshes[k].uuid) === e);
    const dsts = idx.map(k => dstMeshes[k]);
    // The cloned materials still point at the source texture: put back the pre-artwork state
    idx.forEach((k) => {
      const t = e.targets.find(tt => tt.mesh === srcMeshes[k]);
      const mat = dstMeshes[k].material;
      mat.map = t.originalMap;
      if (mat.color) mat.color.setHex(t.originalColor);
    });
    const ne = createEntry(THREE, dsts, { w: e.w, h: e.h, kind: e.kind, axis: e.axis, flipY: e.texture.flipY });
    ne.targets.forEach((t, j) => {
      const ot = e.targets.find(tt => tt.mesh === srcMeshes[idx[j]]);
      t.originalUv = ot.originalUv ? ot.originalUv.slice() : null;
    });
    ne.material = e.material ? { ...e.material } : null;
    jobs.push(loadState(ne, e.canvas.toJSON()).then(() => resetHistory(ne)));
  });
  return Promise.all(jobs);
}

// Cheap fingerprint of all artwork (used by autosave to detect changes)
export const artworkVersionSum = () => {
  let n = 0;
  new Set(entries.values()).forEach(e => { n += e.version + 1; });
  return n;
};

/* ---------------- PNG / SVG output ---------------- */
export const exportArtworkPNG = (mesh) => getArtwork(mesh)?.canvas.toDataURL({ format: 'png', multiplier: 1 });
export const exportArtworkSVG = (mesh) => getArtwork(mesh)?.canvas.toSVG();

/* ---------------- fabric re-exports ---------------- */
export const loadFabricImage = (url) => fabric.FabricImage.fromURL(url);
export const { IText } = fabric;

export async function svgToFabric(svgString) {
  const { objects, options } = await fabric.loadSVGFromString(svgString);
  const valid = objects.filter(Boolean);
  if (!valid.length) throw new Error('SVG has no drawable shapes');
  return fabric.util.groupSVGElements(valid, options);
}

// Apply a fill to a shape or every part of a grouped SVG
export function recolor(obj, color) {
  if (!obj) return;
  if (obj.getObjects) obj.getObjects().forEach(o => recolor(o, color));
  else if (obj.type !== 'image') obj.set('fill', color);
}
