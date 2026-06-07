
import { defineConfig } from 'astro/config';
import { locales, defaultLocale } from './src/i18n/i18n.config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { remarkWikiLinks } from './src/lib/wikilinks';

const DEFAULT_SITE_URL = 'http://localhost:4321';
let SITE_URL: string;
try {
  SITE_URL = new URL(process.env.SITE_URL || DEFAULT_SITE_URL).toString();
} catch {
  throw new Error('[astro.config] SITE_URL must be a valid URL');
}
if (process.env.NODE_ENV !== 'development' && SITE_URL === DEFAULT_SITE_URL) {
  throw new Error('[astro.config] SITE_URL must be configured in production');
}
const rawBasePath = process.env.BASE_PATH || '/';
if (!rawBasePath.startsWith('/')) {
  throw new Error('[astro.config] BASE_PATH must start with /');
}
const BASE_PATH = rawBasePath.replace(/\/+$/, '') || '/';

// https://astro.build/config
export default defineConfig({
  integrations: [
    mdx(),
    sitemap({
      i18n: {
        defaultLocale,
        locales: Object.fromEntries(locales.map((loc) => [loc, loc]))
      }
    })
  ],
  site: SITE_URL,
  base: BASE_PATH,
  i18n: {
    locales,
    defaultLocale,
    routing: {
      prefixDefaultLocale: true
    }
  },
  markdown: {
    remarkPlugins: [
      [remarkWikiLinks, { base: BASE_PATH === '/' ? '' : BASE_PATH}],
    ],
  }
});