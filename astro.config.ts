/**
 * astro.config.ts
 * Astroの設定ファイル
 */
import { defineConfig } from 'astro/config';
import { locales, defaultLocale } from './src/i18n/i18n.config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkWikiLinks } from './src/lib/wikilinks';

// SITE_URLの設定
const DEFAULT_SITE_URL = 'http://localhost:4321'; // 開発時のデフォルト値
let SITE_URL: string;
try {
  // .envファイルからSITE_URLを読み込み、ない場合はデフォルト値を使用してURLオブジェクトに変換する
  SITE_URL = new URL(process.env.SITE_URL || DEFAULT_SITE_URL).toString();
} catch {
  // URLオブジェクトの生成に失敗した場合、エラーを投げる
  throw new Error('[astro.config] SITE_URL must be a valid URL');
}
if (process.env.NODE_ENV !== 'development' && SITE_URL === DEFAULT_SITE_URL) {
  // 開発環境以外でデフォルト値が使用された場合、エラーを投げる
  throw new Error('[astro.config] SITE_URL must be configured in production');
}

// BASE_PATHの設定
// .envファイルからBASE_PATHを読み込み、ない場合は'/'を使用する
const rawBasePath = process.env.BASE_PATH || '/';
if (!rawBasePath.startsWith('/')) {
  // BASE_PATHが/で始まらない場合、エラーを投げる
  throw new Error('[astro.config] BASE_PATH must start with /');
}
// BASE_PATHの末尾の/を削除する
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
      remarkMath
    ],
    rehypePlugins: [
      rehypeKatex
    ]
  }
});