import type { MetadataRoute } from 'next';
import { PAGES, abs } from '../lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: abs(PAGES.home.path), lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: abs(PAGES.designArea.path), lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: abs(PAGES.cueCase.path), lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: abs('/llms.txt'), lastModified, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
