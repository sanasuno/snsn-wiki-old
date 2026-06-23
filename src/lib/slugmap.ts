/**
 * @lib/slugmap.ts
 * ページタイトル・エイリアスからスラッグを検索するためのマップ
 * remark プラグインはビルド時に同期的に動作するため、
 * ビルド前にキャッシュファイルを生成して参照する
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseFrontmatter } from 'astro/markdown';
import { slugify, toRealSlug, resolveSlug, type SlugMap } from './slugCore';
import { parseNormalizedFrontmatter } from './frontmatterUtils';

export { slugify, toRealSlug, resolveSlug, type SlugMap };

/**
 * ファイルパスからディレクトリ込みのスラッグを生成する関数
 * @param filePath ファイルパス
 * @returns ディレクトリ込みのスラッグ
 */
export function pathToSlug(filePath: string): string {
    return path
        .relative(process.cwd(), filePath) // プロジェクトルートからの相対パス
        .replace(/\.(md|mdx)$/, '') // 拡張子を削除
        .split('/') // パスを分割
        .map(part => slugify(part)) // 各部分をスラッグ化
        .join('/');
}

/**
 * Wikiファイルをスキャンしてスラッグマップを生成する関数
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
                const raw = fs.readFileSync(fullPath, 'utf-8');
                const { meta } = parseNormalizedFrontmatter(raw);
                let isDraft = false;
                let isHidden = false;
                // title があればスラッグマップに追加
                const titleMatch = meta.title as string | undefined;
                if (titleMatch) {
                    map[slugify(titleMatch.trim())] = baseSlug;
                }
                // aliases（複数行形式）があればスラッグマップに追加
                const aliasLines = meta.aliases as string[] | undefined;
                if (aliasLines) {
                    for (const line of aliasLines) {
                        const a = line.replace(/["']/g, '').trim();
                        if (a) {
                            map[slugify(a)] = baseSlug;
                        }
                    }
                }
                // draft と hidden の判定
                isDraft = meta.draft === true;
                isHidden = meta.hidden === true;
                // publishOnly が true の場合、draft または hidden のページは除外
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

interface SlugmapCache {
    map: SlugMap;
    slugs: Set<string>;
}

// キャッシュ
let _cache: SlugmapCache | null = null;
const CACHE_PATH = path.resolve(process.cwd(), '.node_modules/.cache/snsn-wiki-slugmap.json');
const WIKI_DIR = path.resolve(process.cwd(), 'src/content/wiki');

/**
 * キャッシュファイルの最終更新時刻を取得する関数
 * @returns キャッシュファイルの最終更新時刻（ミリ秒）
 */
function getCacheMtime(): number {
    try {
        return fs.statSync(CACHE_PATH).mtimeMs;
    } catch (error) {
        return 0;
    }
}

/**
 * Wikiディレクトリの最新更新時刻を取得する関数
 * @param dir Wikiディレクトリのパス
 * @returns Wikiディレクトリの最新更新時刻（ミリ秒）
 */
function getWikiLatestMtime(dir: string): number {
    let latest = 0;
    if (!fs.existsSync(dir)) return latest;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            latest = Math.max(latest, getWikiLatestMtime(fullPath));
        } else {
            try {
                latest = Math.max(latest, fs.statSync(fullPath).mtimeMs);
            } catch (error) {
                console.error(`Error getting mtime for file ${fullPath}:`, error);
            }
        }
    }
    return latest;
}

/**
 * Wikiディレクトリ内のMD/MDXファイルの数を取得する関数
 * @param dir Wikiディレクトリのパス
 * @returns MD/MDXファイルの数
 */
function getWikiFileCount(dir: string): number {
    let count = 0;
    if (!fs.existsSync(dir)) return count;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            count += getWikiFileCount(fullPath);
        } else if (/\.(md|mdx)$/.test(entry.name)) {
            count++;
        }
    }
    return count;
}

/**
 * キャッシュを構築する関数
 * @returns キャッシュ
 */
function buildCache(): SlugmapCache {
    // キャッシュがあれば返す
    if (_cache) return _cache;
    // キャッシュとWikiの更新日時を取得
    const cacheMtime = getCacheMtime();
    const wikiMtime = getWikiLatestMtime(WIKI_DIR);
    // キャッシュがwikiより新しい場合、キャッシュを返す
    if (cacheMtime > wikiMtime && fs.existsSync(CACHE_PATH)) {
        try {
            const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
            const { map, slugs: slugArr, fileCount } = JSON.parse(raw) as { map: SlugMap; slugs: string[]; fileCount?: number };
            const currentFileCount = getWikiFileCount(WIKI_DIR);
            // ファイル数が変更されている場合は再構築
            if (fileCount !== undefined && fileCount === currentFileCount) {
                _cache = { map, slugs: new Set(slugArr) };
                return _cache;
            }
            console.log('File count has changed, rebuilding cache');
        } catch (error) {
            console.error('Error reading cache file:', error);
        }
    }
    
    // wikiディレクトリをスキャン
    const wikiDir = path.resolve(process.cwd(), 'src/content/wiki');
    const map: SlugMap = {};
    const slugs = new Set<string>();

    // ディレクトリが存在しない場合は空のキャッシュを返す
    if (!fs.existsSync(wikiDir)) {
        _cache = { map, slugs };
        return _cache;
    }

    // ロケールを取得
    const locales = fs.readdirSync(wikiDir, { withFileTypes: true })
        .filter(dir => dir.isDirectory())
        .map(dir => dir.name);
    
    for (const locale of locales) {
        const localeDir = path.join(wikiDir, locale);

        // mapは全ページ（draft/hidden含む）のtitle/aliasを収録
        const allLocaleSlugs = new Set<string>();
        const localeMap = scanWikiFiles(localeDir, allLocaleSlugs, locale, false);
        Object.assign(map, localeMap);

        // slugsは公開ページのみのスラッグを収録
        const publishedLocaleSlugs = new Set<string>();
        scanWikiFiles(localeDir, publishedLocaleSlugs, locale, true);
        for (const slug of publishedLocaleSlugs) {
            slugs.add(`${locale}/${slug}`);
        }
    }
    try {
        // キャッシュディレクトリを作成
        fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
        // キャッシュを書き込み
        fs.writeFileSync(CACHE_PATH, JSON.stringify({
            map,
            slugs: [...slugs],
            fileCount: getWikiFileCount(WIKI_DIR)
        }, null, 2));
    } catch (e) {
        console.error('Failed to create cache directory:', e);
    }

    _cache = { map, slugs };
    return _cache;
}

/**
 * ビルド時に Content Collections を使わずに
 * src/content/wiki/ を直接スキャンしてスラッグマップを構築
 * @returns スラッグマップ
 */
export function buildSlugMapSync(): SlugMap {
    return buildCache().map;
}


/**
 * 公開済みページ（draft: false かつ hidden: false のページ）の
 * 実際の物理スラッグ集合を返す
 * @returns 実際の物理スラッグ集合
 */
export function buildPublishedSlugs(): Set<string> {
    return buildCache().slugs;
}