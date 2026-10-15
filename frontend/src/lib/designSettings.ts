// Design settings: hoop, underlay and stitch parameters shared by the settings panel, the digitizer call and the previews.
import type { DigitizeOptions } from './api';

export interface Hoop { id: string; label: string; w: number; h: number }

export const HOOPS: Hoop[] = [
  { id: 'cap',     label: 'Cap · 2.4" × 1.4" (60 × 35 mm)',      w: 60,  h: 35 },
  { id: '4x4',     label: '4" × 4" (100 × 100 mm)',               w: 100, h: 100 },
  { id: '5x7',     label: '5" × 7" (130 × 180 mm)',               w: 130, h: 180 },
  { id: '6x10',    label: '6" × 10" (160 × 260 mm)',              w: 160, h: 260 },
  { id: '8x8',     label: '8" × 8" (200 × 200 mm)',               w: 200, h: 200 },
  { id: '14x8',    label: '14" × 8" (360 × 200 mm)',              w: 360, h: 200 },
  { id: 'custom',  label: 'Custom size…',                         w: 80,  h: 80 },
];

export interface UnderlayOption { id: string; label: string; help: string }

export const UNDERLAYS: UnderlayOption[] = [
  { id: 'auto',      label: 'Auto (recommended)', help: 'Chooses for the stitch method: edge run plus grid under fills, edge run under satin.' },
  { id: 'edge',      label: 'Edge Run',           help: 'A running stitch just inside the edge, so the fill has a firm border to stop against.' },
  { id: 'zigzag',    label: 'Zigzag',             help: 'Zigzag stitches across the shape, perpendicular to the top stitches. Lifts and stabilises satin and small fills.' },
  { id: 'grid',      label: 'Grid',               help: 'A sparse grid perpendicular to the top stitches. Holds stretchy fabric flat under large fills.' },
  { id: 'edge_grid', label: 'Edge Run + Grid',    help: 'Edge run plus grid: the firmest foundation, for big fills on stretch or pile fabric.' },
  { id: 'none',      label: 'None',               help: 'No foundation. Use only for stable fabrics or when stacking designs, or the fill may sink and pucker.' },
];

export interface DesignSettings {
  name: string;
  hoopId: string;
  customW: number;
  customH: number;
  underlay: string;
  /** null = automatic (from the fabric profile / method default) */
  pullComp: number | null;
  density: number | null;
  stitchLen: number | null;
  angle: number | null;
  maxColors: number;
  background: 'auto' | 'white' | 'none';
  enclosedAsFabric: boolean;
}

export const DEFAULT_SETTINGS: DesignSettings = {
  name: '', hoopId: '5x7', customW: 80, customH: 80,
  underlay: 'auto', pullComp: null, density: null, stitchLen: null, angle: null,
  maxColors: 8, background: 'auto', enclosedAsFabric: true,
};

export const hoopSize = (s: DesignSettings) => {
  if (s.hoopId === 'custom') return { w: s.customW, h: s.customH };
  const h = HOOPS.find(x => x.id === s.hoopId) ?? HOOPS[2];
  return { w: h.w, h: h.h };
};

/** Options for the digitize / preview endpoints. Unset (auto) values are left out so the backend picks them. */
export function toDigitizeOptions(s: DesignSettings): DigitizeOptions {
  const { w, h } = hoopSize(s);
  return {
    widthMm: w, heightMm: h, underlay: s.underlay,
    pullComp: s.pullComp ?? undefined, density: s.density ?? undefined,
    angle: s.angle ?? undefined, stitchLen: s.stitchLen ?? undefined,
    maxColors: s.maxColors, background: s.background, enclosedAsFabric: s.enclosedAsFabric,
  };
}

/** Stable string for change detection (effects, caches). */
export const settingsKey = (s: DesignSettings) =>
  [s.name, s.hoopId, s.customW, s.customH, s.underlay, s.pullComp, s.density, s.stitchLen, s.angle, s.maxColors, s.background, s.enclosedAsFabric].join('|');

/** Mirrors the backend fabric profiles so the "Auto" hints show real numbers. */
export const FABRIC_PROFILES: Record<string, { pull: number; density: number }> = {
  cotton: { pull: 0.25, density: 0.40 }, denim: { pull: 0.20, density: 0.42 }, fleece: { pull: 0.40, density: 0.36 },
  leather: { pull: 0.15, density: 0.45 }, silk: { pull: 0.30, density: 0.45 },
};
export const fabricProfile = (id: string) => FABRIC_PROFILES[id] ?? { pull: 0.20, density: 0.40 };
