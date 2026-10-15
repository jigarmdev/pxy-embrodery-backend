// Embroidery thread types, modelled on how real threads look and behave.
// Sources agree on the broad picture: polyester = durable and colourfast, rayon = high sheen,
// cotton = matte and lint-prone, silk = most luminous, metallic = foil-wrapped and sparkly.
import type { ThreadStyle } from './dstRender';

export interface ThreadType extends ThreadStyle {
  id: string;
  name: string;
  fiber: string;
  weight: string;
  notes: string;
}

export const THREAD_TYPES: ThreadType[] = [
  { id: 'polyester', name: 'Polyester', fiber: 'Polyester', weight: '40 wt', widthMm: 0.40, sheen: 0.55, fuzz: 0, metallic: false, glow: 0, variegated: false,
    notes: 'The workhorse: strong, colourfast, resists abrasion and sunlight. Less shiny than rayon.' },
  { id: 'rayon', name: 'Rayon', fiber: 'Viscose rayon', weight: '40 wt', widthMm: 0.40, sheen: 0.95, fuzz: 0, metallic: false, glow: 0, variegated: false,
    notes: 'Highest sheen of the common threads and runs well, but cannot be bleached and may fade in UV light.' },
  { id: 'silk', name: 'Silk', fiber: 'Silk', weight: '50 wt', widthMm: 0.34, sheen: 1.0, fuzz: 0, metallic: false, glow: 0.04, variegated: false,
    notes: 'Strong, fine and the most luminous, with a soft glow polyester and rayon cannot match. Expensive.' },
  { id: 'cotton', name: 'Cotton', fiber: 'Cotton', weight: '30 wt', widthMm: 0.52, sheen: 0.06, fuzz: 0.9, metallic: false, glow: 0, variegated: false, plies: 3,
    notes: 'Matte, traditional look for quilting and redwork. Lints more and is weaker, so tension may need adjusting.' },
  { id: 'fine', name: 'Fine polyester', fiber: 'Polyester', weight: '60 wt', widthMm: 0.30, sheen: 0.6, fuzz: 0, metallic: false, glow: 0, variegated: false,
    notes: 'Thin thread for small lettering and fine detail. The finer the thread, the more likely it is to break.' },
  { id: 'metallic', name: 'Metallic', fiber: 'Foil-wrapped core', weight: '40 wt', widthMm: 0.46, sheen: 1.0, fuzz: 0, metallic: true, glow: 0, variegated: false,
    notes: 'Foil wrap catches the light. Prone to twisting and kinking: slow the machine and use a thread stand.' },
  { id: 'neon', name: 'Neon / fluorescent', fiber: 'Polyester', weight: '40 wt', widthMm: 0.40, sheen: 0.7, fuzz: 0, metallic: false, glow: 0.18, variegated: false,
    notes: 'Fluorescent dyed polyester for safety wear and bold accents.' },
  { id: 'glow', name: 'Glow in the dark', fiber: 'Phosphorescent polyester', weight: '40 wt', widthMm: 0.42, sheen: 0.5, fuzz: 0, metallic: false, glow: 0.5, variegated: false,
    notes: 'Charges in light and glows in the dark. Usually pale green or white by day.' },
  { id: 'variegated', name: 'Variegated rayon', fiber: 'Viscose rayon', weight: '40 wt', widthMm: 0.40, sheen: 0.9, fuzz: 0, metallic: false, glow: 0, variegated: true,
    notes: 'One spool shifts through several colours along its length, giving an ombre effect without colour changes.' },
];

export const DEFAULT_THREAD = THREAD_TYPES[0];

/** Stops a variegated thread cycles through (used when a thread type is variegated). */
export const VARIEGATED_STOPS = ['#1e3a8a', '#7c3aed', '#db2777', '#f97316', '#facc15'];

/** A curated thread colour palette (our own naming, not a vendor chart). */
export const THREAD_COLORS: { name: string; hex: string }[] = [
  { name: 'Jet Black', hex: '#111111' }, { name: 'Charcoal', hex: '#3b3f46' }, { name: 'Silver Grey', hex: '#9aa0a8' }, { name: 'Snow White', hex: '#f8f8f4' },
  { name: 'Cream', hex: '#efe3c4' }, { name: 'Sand', hex: '#cdb38a' }, { name: 'Chestnut', hex: '#7a4a2b' }, { name: 'Espresso', hex: '#3e2a1f' },
  { name: 'Scarlet', hex: '#d3202f' }, { name: 'Crimson', hex: '#9c1230' }, { name: 'Coral', hex: '#f26d5b' }, { name: 'Blush Pink', hex: '#f4a6bd' },
  { name: 'Hot Pink', hex: '#e0278c' }, { name: 'Orchid', hex: '#a24cc4' }, { name: 'Royal Purple', hex: '#5a2d91' }, { name: 'Lavender', hex: '#b9a5e0' },
  { name: 'Navy', hex: '#14284b' }, { name: 'Royal Blue', hex: '#1f55c9' }, { name: 'Sky Blue', hex: '#59a8e6' }, { name: 'Teal', hex: '#0f8a8a' },
  { name: 'Emerald', hex: '#109a55' }, { name: 'Kelly Green', hex: '#2ea84b' }, { name: 'Lime', hex: '#9ccc3c' }, { name: 'Olive', hex: '#6b7a2c' },
  { name: 'Sunflower', hex: '#f5c518' }, { name: 'Tangerine', hex: '#f58220' }, { name: 'Burnt Orange', hex: '#c4551b' }, { name: 'Gold', hex: '#c9a227' },
];
