import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://oggahub.com';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/broker/',
        '/realtor/',
        '/owner/',
        '/dashboard/',
        '/favorites',
        '/saved-searches',
        '/property/*/schedule-visit',
        '/start',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
