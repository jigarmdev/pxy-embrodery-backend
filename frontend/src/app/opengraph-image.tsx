import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '../lib/seo';

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: 'linear-gradient(135deg,#070b14,#1e1b4b)', color: '#fff' }}>
        <div style={{ fontSize: 40, color: '#a5b4fc', fontWeight: 700 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.1, marginTop: 24 }}>Logo to embroidery file</div>
        <div style={{ fontSize: 34, color: '#cbd5e1', marginTop: 24 }}>Preview real thread · Export DST, PES, JEF, EXP, VP3, XXX</div>
      </div>
    ),
    size,
  );
}
