/**
 * src/scripts/buildSearchIndex.ts
 *
 * ビルド前に全WikiページのタイトルA+本文テキストを収集し、
 * ロケール別の検索インデックスJSONを public/ に出力するスクリプト。
 *
 * 実行方法:
 *   npx tsx src/scripts/buildSearchIndex.ts
 *
 * package.json の prebuild / "build" フックに追加すると自動実行できる:
 *   "prebuild": "tsx src/scripts/buildSearchIndex.ts",
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

// ----------------------------------------
// 型定義
// ----------------------------------------

export interface SearchEntry {
    /** ページのURL（BASE_URLは含まない、先頭スラッシュあり） */
    url: string;
    /** ページタイトル */
    title: string;
    /** 本文の先頭 ~300 文字（スニペット表示用） */
    excerpt: string;
    /** フルテキスト（検索対象） */
    body: string;
}

// ----------------------------------------
// 設定
// ----------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = path.resolve(__dirname, '../content/wiki');
const PUBLIC_DIR   = path.resolve(__dirname, '../../public');

/** サポートするロケール（i18n.config.ts の locales と合わせる） */
import { locales } from '@i18n/i18n.config';
const LOCALES = locales as readonly string[];
type Locale = typeof LOCALES[number];

// ----------------------------------------
// フロントマター解析ユーティリティ
// ----------------------------------------

interface FrontMatter {
    title?: string;
    draft?: boolean;
    hidden?: boolean;
    [key: string]: unknown;
}

function parseFrontMatter(raw: string): { meta: FrontMatter; body: string } {
    // Windows 改行正規化
    const content = raw.replace(/\r\n/g, '\n');
    // fronmatterブロックを検出
    const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return { meta: {}, body: content };

    const yamlBlock = match[1];
    const body = match[2] ?? '';

    // YAML パース
    let meta: FrontMatter = {};
    try {
        const parsed = parseYaml(yamlBlock);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            meta = parsed as FrontMatter;
        }
    } catch (e) {
        console.warn('YAML parse error:', e);
    }
    for (const line of yamlBlock.split('\n')) {
        const kv = line.match(/^(\w+):\s*(.+)$/);
        if (!kv) continue;
        const [, key, value] = kv;
        if (value === 'true')       meta[key] = true;
        else if (value === 'false') meta[key] = false;
        else                        meta[key] = value.replace(/^['"]|['"]$/g, '');
    }
    return { meta, body };
}

// ----------------------------------------
// Markdown → プレーンテキスト変換
// ----------------------------------------

function mdToText(md: string): string {
    return md
        // コードブロック除去
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]+`/g, '')
        // WikiLink [[target|label]] → label or target
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        // 画像除去
        .replace(/!\[.*?\]\(.*?\)/g, '')
        // リンク → テキスト
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        // HTML タグ除去
        .replace(/<[^>]+>/g, '')
        // 見出し記号除去
        .replace(/^#{1,6}\s+/gm, '')
        // 強調記号除去
        .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
        // 水平線除去
        .replace(/^[-*_]{3,}\s*$/gm, '')
        // リスト記号除去
        .replace(/^[\s]*[-*+]\s+/gm, '')
        .replace(/^[\s]*\d+\.\s+/gm, '')
        // 余分な空白・改行を圧縮
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ----------------------------------------
// ファイル走査
// ----------------------------------------

function walkDir(dir: string, baseDir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkDir(full, baseDir));
        } else if (/\.(md|mdx)$/.test(entry.name)) {
            results.push(full);
        }
    }
    return results;
}

// ----------------------------------------
// ロケール別エントリ収集
// ----------------------------------------

function buildEntries(locale: Locale): SearchEntry[] {
    const localeDir = path.join(CONTENT_ROOT, locale);
    const files = walkDir(localeDir, localeDir);
    const entries: SearchEntry[] = [];

    for (const filePath of files) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { meta, body } = parseFrontMatter(raw);

        // draft / hidden は除外
        if (meta.draft || meta.hidden) continue;

        const title = (meta.title as string | undefined) ?? path.basename(filePath, path.extname(filePath));

        // ファイルパスからスラグを算出
        const relPath = path.relative(localeDir, filePath);
        // index.md → '' 、foo/index.md → 'foo'
        const slug = relPath
            .replace(/\\/g, '/')
            .replace(/\.mdx?$/, '')
            .replace(/(^|\/)index$/, '')
            .replace(/\/$/, '');

        const url = `/${locale}/wiki${slug ? `/${slug}` : ''}`;

        const plainText = mdToText(body);
        const excerpt = plainText.slice(0, 300).replace(/\s+/g, ' ').trim();

        entries.push({ url, title, excerpt, body: plainText });
    }

    return entries;
}

// ----------------------------------------
// メイン
// ----------------------------------------

function main() {
    console.log('CONTENT_ROOT:', CONTENT_ROOT);
    console.log('PUBLIC_DIR:  ', PUBLIC_DIR);
    if (!fs.existsSync(PUBLIC_DIR)) {
        fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }

    for (const locale of LOCALES) {
        const entries = buildEntries(locale);
        const outPath = path.join(PUBLIC_DIR, `search-index.${locale}.json`);
        fs.writeFileSync(outPath, JSON.stringify(entries, null, 0), 'utf-8');
        console.log(`[search-index] ${locale}: ${entries.length} entries → ${outPath}`);
    }
}

main();