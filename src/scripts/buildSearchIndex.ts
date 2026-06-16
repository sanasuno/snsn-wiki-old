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
import { parseFrontmatter } from 'astro/markdown';
import { locales, type Locale} from '../i18n/i18n.config';
import { parseNormalizedFrontmatter } from '../lib/frontmatterUtils';

// ----------------------------------------
// 型定義
// ----------------------------------------

export interface SearchEntry {
    url: string; // ページのURL（BASE_URLは含まない、先頭スラッシュあり）
    title: string; // ページタイトル
    excerpt: string; // 本文の先頭 ~300 文字（スニペット表示用）
    body: string; // フルテキスト（検索対象）
}

// ----------------------------------------
// 設定
// ----------------------------------------
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/+$/, ''); // Base path (e.g., '/wiki')
const __dirname = path.dirname(fileURLToPath(import.meta.url)); // 現在のスクリプトファイルのディレクトリパス
const CONTENT_ROOT = path.resolve(__dirname, '../content/wiki'); // Wikiコンテンツのルートディレクトリ
const PUBLIC_DIR   = path.resolve(__dirname, '../../public'); // publicディレクトリ


// ----------------------------------------
// フロントマター解析ユーティリティ
// ----------------------------------------

interface FrontMatter {
    title?: string; // ページタイトル
    draft?: boolean; // 下書きフラグ
    hidden?: boolean; // 非表示フラグ
    [key: string]: unknown; // その他のフロントマター項目
}

/**
 * Markdown ファイルのフロントマターを解析する
 * @param raw ファイルの生テキスト
 * @returns フロントマターと本文のオブジェクト
 */
function parseFrontMatter(raw: string): { meta: FrontMatter; body: string } {
    // Windows 改行正規化してからパース
    const { meta, body } = parseNormalizedFrontmatter(raw);
    return {
        meta: (meta as FrontMatter) ?? {},
        body
    };
}

// ----------------------------------------
// Markdown → プレーンテキスト変換
// ----------------------------------------

/**
 * Markdown をプレーンテキストに変換する
 * @param md Markdown テキスト
 * @returns プレーンテキスト
 */
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

/**
 * ディレクトリを再帰的に走査し、Markdown ファイルのパス一覧を返す
 * @param dir 走査するディレクトリパス
 * @param baseDir ベースディレクトリ（相対パス計算用）
 * @returns Markdown ファイルのパス配列
 */
function walkDir(dir: string, baseDir: string): string[] {
    // ディレクトリが存在しない場合は空の配列を返す
    if (!fs.existsSync(dir)) return [];

    // ディレクトリ内のファイルを走査
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // サブディレクトリを再帰的に走査
            results.push(...walkDir(full, baseDir));
        } else if (/\.(md|mdx)$/.test(entry.name)) {
            // Markdown ファイルを追加
            results.push(full);
        }
    }
    return results;
}

// ----------------------------------------
// ロケール別エントリ収集
// ----------------------------------------

/**
 * 指定されたロケールの検索エントリを構築する
 * @param locale ロケール
 * @returns 検索エントリの配列
 */
function buildEntries(locale: Locale): SearchEntry[] {
    const localeDir = path.join(CONTENT_ROOT, locale); //ロケールディレクトリパス
    const files = walkDir(localeDir, localeDir); //ロケールディレクトリ内のファイルを走査した結果

    const entries: SearchEntry[] = [];
    for (const filePath of files) {
        // ファイルを読み込み、FrontMatterと本文に分割
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { meta, body } = parseFrontMatter(raw);

        // draft / hidden は除外
        if (meta.draft || meta.hidden) continue;

        // タイトルを取得（FrontMatterのtitleまたはファイル名）
        const title = (meta.title as string | undefined) ?? path.basename(filePath, path.extname(filePath));

        // ファイルパスからスラグを算出
        const relPath = path.relative(localeDir, filePath);
        const slug = relPath
            .replace(/\\/g, '/') // Windowsのパス区切りを統一
            .replace(/\.mdx?$/, '') // 拡張子を削除
            .replace(/(^|\/)index$/, '') // indexを削除
            .replace(/\/$/, ''); // 末尾のスラッシュを削除

        const url = `${BASE_PATH}/${locale}/wiki${slug ? `/${slug}` : ''}`; // URLを構築
        const plainText = mdToText(body); // 本文をテキストに変換
        const excerpt = plainText.slice(0, 300).replace(/\s+/g, ' ').trim(); // 本文の先頭300文字を抜粋

        entries.push({ url, title, excerpt, body: plainText });
    }

    return entries;
}

// ----------------------------------------
// メイン
// ----------------------------------------

/**
 * 検索インデックスをビルドするメイン関数
 */
function main() {
    // デバッグ用ログ
    console.log('CONTENT_ROOT:', CONTENT_ROOT);
    console.log('PUBLIC_DIR:  ', PUBLIC_DIR);

    // public ディレクトリが存在しない場合は作成
    if (!fs.existsSync(PUBLIC_DIR)) {
        fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }

    // 各ロケールに対してインデックスを生成
    for (const locale of locales) {
        const entries = buildEntries(locale); // エントリを生成
        const outPath = path.join(PUBLIC_DIR, `search-index.${locale}.json`); // 出力パス
        // JSONファイルに書き込み、改行なしで出力
        fs.writeFileSync(outPath, JSON.stringify(entries, null, 0), 'utf-8');
        // ログ出力
        console.log(`[search-index] ${locale}: ${entries.length} entries → ${outPath}`);
    }
}

main();