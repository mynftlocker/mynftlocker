import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: 'https://mynftlocker.com', lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: 'https://mynftlocker.com/cgu', lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
