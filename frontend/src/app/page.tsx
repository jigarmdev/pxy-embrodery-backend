import type { Metadata } from 'next';
import JsonLd from '../components/JsonLd';
import SimulatorApp from '../components/SimulatorApp';
import SeoContent from '../components/SeoContent';
import { FAQS, FORMATS, HOW_TO, PAGES, SITE_DESCRIPTION, SITE_NAME, abs } from '../lib/seo';

export const metadata: Metadata = {
  title: { absolute: `${PAGES.home.title} | ${SITE_NAME}` },
  description: PAGES.home.description,
  alternates: { canonical: '/' },
  openGraph: { url: '/', title: PAGES.home.title, description: PAGES.home.description },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': abs('/#app'),
    name: SITE_NAME,
    url: abs('/'),
    description: SITE_DESCRIPTION,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript and a modern browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: [
      'Logo and image to embroidery file conversion',
      `Export formats: ${FORMATS.map(f => f.id).join(', ')}`,
      'Realistic thread and stitch preview',
      'Automatic stitch type selection (tatami, satin, running)',
      'Stitch count, sew time and cost estimation',
      'DST file viewer and analyser',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to convert a logo to an embroidery file',
    step: HOW_TO.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Embroidery Simulator', item: abs('/') }],
  },
];

export default function Home() {
  return (
    <main id="main" className="themed flex-1 bg-slate-100 p-3 sm:p-4 md:p-8 font-sans text-slate-900">
      <JsonLd data={jsonLd} />
      <div className="max-w-[1600px] mx-auto">
        <SimulatorApp />
        <SeoContent />
      </div>
    </main>
  );
}
