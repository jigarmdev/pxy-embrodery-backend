import type { Metadata } from 'next';
import JsonLd from '../../components/JsonLd';
import { PAGES, SITE_NAME, abs } from '../../lib/seo';

export const metadata: Metadata = {
  title: PAGES.designArea.title,
  description: PAGES.designArea.description,
  alternates: { canonical: PAGES.designArea.path },
  openGraph: { url: PAGES.designArea.path, title: PAGES.designArea.title, description: PAGES.designArea.description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: `${SITE_NAME} Design Area Detection`, url: abs(PAGES.designArea.path),
          description: PAGES.designArea.description, applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
          { '@type': 'ListItem', position: 2, name: 'Design Area Detection', item: abs(PAGES.designArea.path) }] },
      ]} />
      {children}
    </>
  );
}
