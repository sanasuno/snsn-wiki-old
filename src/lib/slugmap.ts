/**
 * @lib/slugmap.ts
 * ページタイトル・エイリアスからスラッグを検索するためのマップ
 * remark プラグインはビルド時に同期的に動作するため、
 * ビルド前にキャッシュファイルを生成して参照する
 */

import * as fs from 'fs';
import * as path from 'path';

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
        .relative(process.cwd(), filePath)
        .replace(/\.(md|mdx)$/, '')
        .split('/')
        .map(part => slugify(part))
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

let _cache: SlugMap | null = null;
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
                // \r\n → \n に正規化してからパース
                const content = fs.readFileSync(fullPath, 'utf-8').replace(/\r\n/g, '\n');
                const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
                let isDraft = false;
                let isHidden = false;
                if (fmMatch) {
                    const fm = fmMatch[1];
                    // title があればスラッグマップに追加
                    const titleMatch = fm.match(/^title:\s*["']?(.*?)["']?\s*$/m);
                    if (titleMatch) {
                        const title = titleMatch[1].trim();
                        map[slugify(title)] = baseSlug;
                    }
                    // aliases (インライン形式) があればスラッグマップに追加
                    const aliasBlock = fm.match(/^aliases:\s*\[([^\]]+)\]/m);
                    if (aliasBlock) {
                        for (const alias of aliasBlock[1].split(',')) {
                            const aliasName = alias.trim().replace(/["']/g, '');
                            map[slugify(aliasName)] = baseSlug;
                        }
                    }
                    // aliases（複数行形式）があればスラッグマップに追加
                    const aliasLines = fm.match(/^aliases:\s*\r?\n((?:\s*-\s*.+\r?\n?)+)/m);
                    if (aliasLines) {
                        for (const line of aliasLines[1].split('\n')) {
                            const a = line.replace(/^\s*-\s*/, '').replace(/["']/g, '').trim();
                            if (a) {
                                map[slugify(a)] = baseSlug;
                            }
                        }
                    }
                    isDraft = /^draft:\s*true/m.test(fm);
                    isHidden = /^hidden:\s*true/m.test(fm);
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
    // キャッシュがあれば返す
    if (_cache) {
        return _cache;
    }
    
    // キャッシュファイルがあれば使う（同一ビルド内での重複ビルド防止）
    if (fs.existsSync(CACHE_PATH)) {
        try {
            const stat = fs.statSync(CACHE_PATH);
            // 1分以内のキャッシュなら再利用
            if (Date.now() - stat.mtimeMs < 60 * 1000) {
                const data = fs.readFileSync(CACHE_PATH, 'utf-8');
                _cache = JSON.parse(data) as SlugMap;
                return _cache;
            }
        } catch (error) {
            console.error('Failed to read slugmap cache:', error);
        }
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
 * テキストから実スラッグに解決
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
 */
export function buildPublishedSlugs(): Set<string> {
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
    return publishedSlugs;
}