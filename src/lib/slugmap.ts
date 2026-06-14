/**
 * @lib/slugmap.ts
 * ページタイトル・エイリアスからスラッグを検索するためのマップ
 * remark プラグインはビルド時に同期的に動作するため、
 * ビルド前にキャッシュファイルを生成して参照する
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseFrontmatter } from 'astro/markdown';

/**
 * ページ名をURLスラッグに変換する
 * URLエンコード対応
 * @param text ページ名
 * @returns URLスラッグ
 */
export function slugify(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '') // 特殊文字を削除
        .replace(/[\s_-]+/g, '-') // スペースとアンダースコアをハイフンに置換
        .replace(/--+/g, '-') // 連続するハイフンを1つに
        .replace(/^-+|-+$/g, ''); // 先頭と末尾のハイフンを削除
}

/**
 * ファイルパスからディレクトリ込みのスラッグを生成する
 * @param filePath ファイルパス
 * @returns ディレクトリ込みのスラッグ
 */
export function pathToSlug(filePath: string): string {
    return path
        .relative(process.cwd(), filePath) // プロジェクトルートからの相対パス
        .replace(/\.(md|mdx)$/, '') // 拡張子を削除
        .split('/')
        .map(part => slugify(part)) // 各部分をスラッグ化
        .join('/');
}

export type SlugMap = Record<string, string> // 正規化テキスト → 実スラッグ

/**
 * 実スラッグ（ロケールプレフィックスなし）への変換
 * @param fullSlug 完全なスラッグ（例: ja/recipes/pasta）
 * @returns 実スラッグ（例: recipes/pasta）
 */
export function toRealSlug(fullSlug: string): string {
    const parts = fullSlug.split('/');

    // ルートスラッグの場合は空文字を返す
    if (parts.length < 2) {
        return '';
    }
    return parts.slice(1).join('/');
}

// キャッシュ
let _cache: SlugMap | null = null;
let _slugsCache: Set<string> | null = null;
const CACHE_PATH = path.resolve(process.cwd(), '.node_modules/.cache/snsn-wiki-slugmap.json');

/**
 * Wikiファイルをスキャンしてスラッグマップを生成する
 * @param dir スキャンするディレクトリ
 * @param slugs 既存のスラッグセット
 * @param prefix プレフィックス（再帰呼び出し用）
 * @param publishOnly 公開済みファイルのみスキャンするか
 * @returns スラッグマップ
 */
export function scanWikiFiles(dir: string, slugs: Set<string>, prefix: string = '', publishOnly: boolean = false): SlugMap {
    const map: SlugMap = {};
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // ディレクトリは再帰的にスキャン
            Object.assign(map, scanWikiFiles(fullPath, slugs, prefix ? `${prefix}/${entry.name}` : entry.name, publishOnly));
        } else if (entry.name.match(/\.(md|mdx)$/)) {
            // ファイルはスラッグマップに追加
            const baseName = entry.name.replace(/\.(md|mdx)$/, '');
            // ディレクトリパスをスラッグ化
            const parts = prefix ? prefix.split('/').map(slugify) : [];
            // ルートディレクトリをスキップ
            const baseSlugParts = parts.slice(1);
            baseSlugParts.push(slugify(baseName));
            const baseSlug = baseSlugParts.join('/');

            // ファイル名をキーにスラッグを登録
            map[slugify(baseName)] = baseSlug;

            // frontmatter を簡易パース
            try {
                const parsed = parseFrontmatter(fs.readFileSync(fullPath, 'utf-8'));
                let isDraft = false;
                let isHidden = false;
                if (parsed) {
                    // title があればスラッグマップに追加
                    const titleMatch = parsed.frontmatter.title;
                    if (titleMatch) {
                        const title = titleMatch.trim();
                        map[slugify(title)] = baseSlug;
                    }
                    // aliases（複数行形式）があればスラッグマップに追加
                    const aliasLines = parsed.frontmatter.aliases;
                    if (aliasLines) {
                        for (const line of aliasLines) {
                            const a = line.replace(/["']/g, '').trim();
                            if (a) {
                                map[slugify(a)] = baseSlug;
                            }
                        }
                    }
                    isDraft = parsed.frontmatter.draft === true;
                    isHidden = parsed.frontmatter.hidden === true;
                }
                if (!publishOnly || (!isDraft && !isHidden)) {
                    slugs.add(baseSlug);
                }
            } catch (error) {
                console.error(`Error reading file ${fullPath}:`, error);
            }
        }
    }
    return map;
}

/**
 * ビルド時に Content Collections を使わずに
 * src/content/wiki/ を直接スキャンしてスラッグマップを構築
 * @returns スラッグマップ
 */
export function buildSlugMapSync(): SlugMap {
    // キャッシュがあれば利用
    if (_cache) {
        return _cache;
    }
    
    // wikiディレクトリをスキャン
    const wikiDir = path.resolve(process.cwd(), 'src/content/wiki');
    const map: SlugMap = {};
    const slugs = new Set<string>();
    if (!fs.existsSync(wikiDir)) {
        return map;
    }
    // .md .mdx ファイルを再帰スキャン
    const wikiMap = scanWikiFiles(wikiDir, slugs);
    Object.assign(map, wikiMap);
    
    // キャッシュ保存
    try {
        fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
        fs.writeFileSync(CACHE_PATH, JSON.stringify(map, null, 2));
    } catch (e) {
        console.error('Failed to save slugmap cache:', e);
    }
    _cache = map;
    return map;
}

/**
 * テキストから実スラッグに解決する
 * @param text テキスト
 * @returns 実スラッグ
 */
export function resolveSlug(text: string, map: SlugMap): string {
    const key = slugify(text);
    return map[key] || text;
}

/**
 * 公開済みページ（draft: false かつ hidden: false のページ）の
 * 実際の物理スラッグ集合を返す
 * @returns 実際の物理スラッグ集合
 */
export function buildPublishedSlugs(): Set<string> {
    // キャッシュがあれば利用
    if (_slugsCache) {
        return _slugsCache;
    }
    
    const wikiDir = path.resolve(process.cwd(), 'src/content/wiki');
    // 公開済みページを抽出
    const publishedSlugs = new Set<string>();
    // ディレクトリが存在しない場合は空のSetを返す
    if (!fs.existsSync(wikiDir)) {
        return publishedSlugs;
    }
    // ロケールディレクトリを直接列挙してプレフィックス付きでスキャン
    const locales = fs.readdirSync(wikiDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);

    for (const locale of locales) {
        const localeDir = path.join(wikiDir, locale);
        const localeSlugs = new Set<string>();
        scanWikiFiles(localeDir, localeSlugs, locale, true);
        // localeSlugs には "my-page" が入る → "locale/my-page" に変換して追加
        for (const slug of localeSlugs) {
            publishedSlugs.add(`${locale}/${slug}`);
        }
    }
    _slugsCache = publishedSlugs;
    return publishedSlugs;
}