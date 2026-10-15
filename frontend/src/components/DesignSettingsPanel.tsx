'use client';

import React from 'react';
import { DesignSettings, HOOPS, UNDERLAYS } from '../lib/designSettings';

interface Props {
  value: DesignSettings;
  onChange: (patch: Partial<DesignSettings>) => void;
  /** shown as the "auto" hint, e.g. "cotton: 0.25" */
  autoPull?: number;
  autoDensity?: number;
  fabricName?: string;
}

const field = 'w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300';
const label = 'block text-sm font-semibold text-gray-700 mb-1.5';
const help = 'text-xs text-gray-500 mt-1.5';

/** Number box that is empty while "auto" and shows a reset link once overridden. */
function NumberField({ id, text, value, onChange, min, max, step, auto, unit, hint }: {
  id: string; text: string; value: number | null; onChange: (v: number | null) => void;
  min: number; max: number; step: number; auto?: number; unit: string; hint: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className={label}>{text} <span className="font-normal text-gray-400">({unit})</span></label>
        {value !== null && <button type="button" onClick={() => onChange(null)} className="text-xs text-indigo-600 hover:underline">Auto</button>}
      </div>
      <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value ?? ''}
             placeholder={auto !== undefined ? `Auto · ${auto}` : 'Auto'}
             onChange={e => {
               if (e.target.value === '') return onChange(null);
               const n = Number(e.target.value);
               if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
             }}
             className={field} />
      <p className={help}>{hint}</p>
    </div>
  );
}

export default function DesignSettingsPanel({ value, onChange, autoPull, autoDensity, fabricName }: Props) {
  const underlay = UNDERLAYS.find(u => u.id === value.underlay) ?? UNDERLAYS[0];
  const custom = value.hoopId === 'custom';
  return (
    <div className="bg-surface p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="flex items-center gap-2.5 text-base font-bold text-gray-900 mb-5">
        <span aria-hidden className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white text-base">⚙</span>
        Design settings
      </h3>

      <div className="space-y-5">
        <div>
          <label htmlFor="ds-name" className={label}>Design name</label>
          <input id="ds-name" type="text" maxLength={16} value={value.name} placeholder="e.g. Logo left chest"
                 onChange={e => onChange({ name: e.target.value })} className={field} />
          <p className={help}>Saved in the file and shown on the machine ({value.name.length}/16 characters).</p>
        </div>

        <div>
          <label htmlFor="ds-hoop" className={label}>Hoop size</label>
          <select id="ds-hoop" value={value.hoopId} onChange={e => onChange({ hoopId: e.target.value })} className={field}>
            {HOOPS.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
          </select>
          {custom && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(['customW', 'customH'] as const).map(k => (
                <div key={k}>
                  <input type="number" min={10} max={1000} step={5} value={value[k]} aria-label={k === 'customW' ? 'Hoop width in mm' : 'Hoop height in mm'}
                         onChange={e => onChange({ [k]: Math.min(1000, Math.max(10, Number(e.target.value) || 10)) })} className={field} />
                  <p className="text-[11px] text-gray-400 mt-1">{k === 'customW' ? 'Width' : 'Height'} (mm)</p>
                </div>
              ))}
            </div>
          )}
          <p className={help}>The design is scaled to fill this hoop.</p>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="ds-colors" className={label}>Thread colours</label>
            <span className="text-sm font-bold text-gray-800 tabular-nums">{value.maxColors}</span>
          </div>
          <input id="ds-colors" type="range" min={1} max={12} step={1} value={value.maxColors}
                 onChange={e => onChange({ maxColors: Number(e.target.value) })} className="w-full accent-indigo-600 h-2" />
          <p className={help}>The most thread colours to use. Fewer colours means fewer colour changes and a faster, cleaner design.</p>
        </div>

        <div>
          <label htmlFor="ds-bg" className={label}>Background</label>
          <select id="ds-bg" value={value.background} onChange={e => onChange({ background: e.target.value as DesignSettings['background'] })} className={field}>
            <option value="auto">Auto: remove the background colour</option>
            <option value="white">White only</option>
            <option value="none">None: sew everything</option>
          </select>
          <label className="mt-2.5 flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={value.enclosedAsFabric} onChange={e => onChange({ enclosedAsFabric: e.target.checked })} className="mt-0.5 accent-indigo-600 w-4 h-4" />
            <span>Enclosed background areas show the fabric (the inside of an A or an O). Turn off if those areas should be sewn.</span>
          </label>
          <p className={help}>The background is never stitched. Transparent PNGs work best.</p>
        </div>

        <div>
          <label htmlFor="ds-underlay" className={label}>Underlay</label>
          <select id="ds-underlay" value={value.underlay} onChange={e => onChange({ underlay: e.target.value })} className={field}>
            {UNDERLAYS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
          <p className={help}>{underlay.help}</p>
        </div>

        <NumberField id="ds-pull" text="Pull compensation" unit="mm" value={value.pullComp} onChange={v => onChange({ pullComp: v })}
                     min={0} max={1} step={0.05} auto={autoPull}
                     hint={`Extra width added so fills don't shrink after sewing.${fabricName ? ` Default comes from ${fabricName}.` : ''}`} />
        <NumberField id="ds-density" text="Density (row spacing)" unit="mm" value={value.density} onChange={v => onChange({ density: v })}
                     min={0.2} max={1.5} step={0.05} auto={autoDensity}
                     hint="Gap between stitch rows. Smaller is denser; too dense puckers the fabric." />
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="ds-len" text="Stitch length" unit="mm" value={value.stitchLen} onChange={v => onChange({ stitchLen: v })}
                       min={1} max={7} step={0.1} hint="Fill stitch length." />
          <NumberField id="ds-angle" text="Fill angle" unit="°" value={value.angle} onChange={v => onChange({ angle: v })}
                       min={0} max={180} step={5} hint="Direction of the rows." />
        </div>
      </div>
    </div>
  );
}
