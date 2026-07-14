/**
 * @lib/buildSearchIndex.ts
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
import { locales, type Locale} from '../../i18n/i18n.config';
import { parseNormalizedFrontmatter } from '../content/frontmatterUtils';
import type { SearchEntry } from '../../types/search';
import { slugify } from '../slug/slugCore';

// ----------------------------------------
// 設定
// ----------------------------------------
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/+$/, ''); // Base path (e.g., '/wiki')
const __dirname = path.dirname(fileURLToPath(import.meta.url)); // 現在のスクリプトファイルのディレクトリパス
const CONTENT_ROOT = path.resolve(__dirname, '../../content/wiki'); // Wikiコンテンツのルートディレクトリ
const PUBLIC_DIR   = path.resolve(__dirname, '../../../public'); // publicディレクトリ


// ----------------------------------------
// Markdown → プレーンテキスト変換
// ----------------------------------------

/**
 * Markdown をプレーンテキストに変換する
 * @param md Markdown テキスト
 * @returns プレーンテキスト
 */
/**
 * Markdown 本文から各種装飾記法やコードブロックなどを除去し、
 * 検索インデックスに適したプレーンテキストに変換する
 * @param md 変換前の Markdown テキスト
 * @returns プレーンテキスト
 */
function mdToText(md: string): string {
    return md
        // 複数行のコードブロック (```...```) を除去
        .replace(/```[\s\S]*?```/g, '')
        // インラインコード ( `code` ) を除去
        .replace(/`[^`]+`/g, '')
        // アンカー付き + 表示ラベルあり: [[Page#Section|Label]] → Label
        .replace(/\[\[([^\]|#]+)#[^\]|]*\|([^\]]+)\]\]/g, '$2')
        // アンカー付き + 表示ラベルなし: [[Page#Section]] → Page（アンカーを除去）
        .replace(/\[\[([^\]|#]+)#[^\]|]*\]\]/g, '$1')
        // 通常の表示ラベルあり: [[Page|Label]] → Label
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        // WikiLink [[ページ名]] を ページ名 ($1) に変換
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        // マークダウンの画像埋め込み (![alt](url)) を除去
        .replace(/!\[.*?\]\(.*?\)/g, '')
        // マークダウンの通常のハイパーリンク ([label](url)) を label ($1) に変換してURLテキストを除去
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        // HTMLタグ (<script>や<div>など) を丸ごと除去
        .replace(/<[^>]+>/g, '')
        // 行頭の見出し記号 (#) とそれに続く空白を除去
        .replace(/^#{1,6}\s+/gm, '')
        // 太字・斜体などの強調記号 (* や _) を除去して中身のテキスト ($1) を残す
        .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
        // 3つ以上のハイフン・アスタリスクによる水平線を除去
        .replace(/^[-*_]{3,}\s*$/gm, '')
        // リスト（箇条書き）の行頭記号 (- または * または +) を除去
        .replace(/^[\s]*[-*+]\s+/gm, '')
        // 連番リストの行頭番号 (1. など) を除去
        .replace(/^[\s]*\d+\.\s+/gm, '')
        // 3つ以上の連続する改行を2つの改行に圧縮して余分な空白行を削除
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ----------------------------------------
// ファイル走査
// ----------------------------------------

/**
 * 指定ディレクトリ配下を再帰的に走査し、すべてのMarkdown/MDXファイルの絶対パス一覧を収集する
 * @param dir 走査対象のディレクトリパス
 * @param baseDir ベースとなるディレクトリ（相対パス計算などに使用）
 * @returns Markdown/MDXファイルの絶対パスの配列
 */
function walkDir(dir: string, baseDir: string): string[] {
    // ディレクトリが存在しない場合はエラーを避け空の配列を返す
    if (!fs.existsSync(dir)) return [];

    const results: string[] = [];
    // ディレクトリ直下のエントリを同期的に取得
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // サブディレクトリの場合はさらに再帰的に探索
            results.push(...walkDir(full, baseDir));
        } else if (/\.(md|mdx)$/.test(entry.name)) {
            // Markdown/MDXファイルが見つかった場合はパスを追加
            results.push(full);
        }
    }
    return results;
}

// ----------------------------------------
// ロケール別エントリ収集
// ----------------------------------------

/**
 * 特定のロケールディレクトリ以下からWikiページを収集し、検索エンジン用のデータ構造（SearchEntry）の配列を構築する
 * @param locale ロケールコード（'ja', 'en' など）
 * @returns 検索インデックス用エントリの配列
 */
function buildEntries(locale: Locale): SearchEntry[] {
    const localeDir = path.join(CONTENT_ROOT, locale); // 対象ロケールのコンテンツルートパス
    const files = walkDir(localeDir, localeDir); // 該当ロケール以下のすべてのMarkdownファイルパスを取得

    const entries: SearchEntry[] = [];
    for (const filePath of files) {
        // ファイルを同期的に読み込み
        const raw = fs.readFileSync(filePath, 'utf-8');
        // frontmatterと本文テキストを分離・抽出
        const { meta, body } = parseNormalizedFrontmatter(raw);

        // 下書き（draft）および非公開（hidden）に設定されているページは検索対象外とする
        if (meta.draft || meta.hidden) continue;

        // タイトルは frontmatter の title を優先し、前提ファイル名（拡張子除く）を使用する
        const title = (meta.title as string | undefined) ?? path.basename(filePath, path.extname(filePath));

        // ロケールディレクトリからの相対パスを利用して、URL構築用のクリーンなスラッグを生成
        const relPath = path.relative(localeDir, filePath);
        const slug = relPath
            .replace(/\\/g, '/') // OS間（特にWindows）のパス区切り文字の違いをスラッシュに統一
            .replace(/\.mdx?$/, '') // 拡張子を削除
            .replace(/(^|\/)index$/, '') // 階層トップ用の index ファイルの場合はスラッグから index を取り除く
            .replace(/\/$/, '') // 末尾のスラッシュを除去
            .split('/') // フォルダ階層ごとに分割
            .filter(Boolean) // 空文字のセグメントを除外
            .map(slugify) // 各セグメントをURLフレンドリーな文字列に変換
            .join('/'); // 再びスラッシュで結合

        // 実際のアクセス先となるサイト相対のURLを組み立てる (例: /ja/wiki/getting-started)
        const url = `${BASE_PATH}/${locale}/wiki${slug ? `/${slug}` : ''}`;
        const plainText = mdToText(body); // 本文をプレーンテキストにクリーンアップ
        // 検索一覧のプレビュー表示用として、本文の先頭300文字を抜粋し、改行や余分な空白を一続きの半角スペースに丸める
        const excerpt = plainText.slice(0, 300).replace(/\s+/g, ' ').trim();

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