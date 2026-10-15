import type { Metadata } from 'next';
import JsonLd from '../../components/JsonLd';
import { PAGES, SITE_NAME, abs } from '../../lib/seo';

export const metadata: Metadata = {
  title: PAGES.cueCase.title,
  description: PAGES.cueCase.description,
  alternates: { canonical: PAGES.cueCase.path },
  openGraph: { url: PAGES.cueCase.path, title: PAGES.cueCase.title, description: PAGES.cueCase.description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: `${SITE_NAME} Cue Case Configurator`, url: abs(PAGES.cueCase.path),
          description: PAGES.cueCase.description, applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
          { '@type': 'ListItem', position: 2, name: 'Cue Case Configurator', item: abs(PAGES.cueCase.path) }] },
      ]} />
      {children}
    </>
  );
}
