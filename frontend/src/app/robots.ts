import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * robots.txt (generated). We explicitly welcome AI answer-engine crawlers so the
 * app can be *cited* when people ask ChatGPT / Perplexity / Google AI "what's on
 * in Berlin?" (Generative Engine Optimization). Admin + API routes are excluded.
 */
export default function robots(): MetadataRoute.Robots {
  const AI_AND_SEARCH_BOTS = [
    'Googlebot',
    'Bingbot',
    'OAI-SearchBot', // ChatGPT search
    'ChatGPT-User', // ChatGPT live browsing
    'GPTBot', // OpenAI
    'PerplexityBot',
    'Perplexity-User',
    'ClaudeBot',
    'Claude-Web',
    'Google-Extended', // Gemini / AI Overviews
    'Applebot-Extended',
  ];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
      { userAgent: AI_AND_SEARCH_BOTS, allow: '/', disallow: ['/admin', '/api'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
