/**
 * @lib/wikilinks.ts
 * [[Page Name]] や [[Page Name|表示名]] [[Page Name#section]] などのWikiリンクを処理するremarkプラグイン
 */
import { visit, SKIP } from 'unist-util-visit';
import type { Root} from 'mdast';
import type { VFile } from 'vfile'
import { defaultLocale, type Locale } from '../i18n/i18n.config';
import { isLocale } from '../scripts/i18n';
import { slugify, buildSlugMapSync, buildPublishedSlugs, resolveSlug, type SlugMap } from './slugmap';

// ==============================
// WikiLink 抽出（静的解析用）
// ==============================

// モジュールトップをキャプチャする
const WIKILINK_REGEX = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;

/**
 * マークダウン本文からWikiリンクの参照先スラッグ一覧を抽出
 * バックリンク・グラフデータ構築に使用
 * @param body マークダウン本文
 * @param sourceLocale ソースページのロケール
 * @param existingSlugs 既存のスラッグセット（オプション）
 * @param slugMap スラッグマップ（オプション）
 * @returns 参照先スラッグの配列
 */
export function extractWikiLinks(
    body: string,
    sourceLocale: Locale = defaultLocale,
    existingSlugs?: Set<string>,
    slugMap?: SlugMap
): string[] {
    const map = slugMap || buildSlugMapSync();
    const slugs = existingSlugs || buildPublishedSlugs();
    const links: string[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(WIKILINK_REGEX.source, 'g');

    // regexでマッチしたすべてのWikiリンクを処理
    while ((match = regex.exec(body)) !== null) {
        const pageName = match[1].trim();
        const baseSlug = resolveSlug(pageName, map);
        let targetFullSlug  = `${sourceLocale}/${baseSlug}`;
        // ページが存在しない場合、デフォルトロケールのページを探す
        if (!slugs.has(targetFullSlug)) {
            if (slugs.has(`${defaultLocale}/${baseSlug}`)) {
                // デフォルトロケールのページが存在する場合、そちらを使う
                targetFullSlug = `${defaultLocale}/${baseSlug}`;
            }
        }
        links.push(targetFullSlug);
    }
    
    return [...new Set(links)] as string[];
}

// ==============================
// WikiLink 変換（remark プラグイン）
// ==============================

/**
 * [[Page Name]] 記法をHTMLリンクに変換するremarkプラグイン
 * @param options オプション
 * @param options.base ベースパス（オプション）
 */
export function remarkWikiLinks(options: { base?: string } = {}) {
    const base = options.base?.replace(/\/$/, '') ?? '';
    const slugMap = buildSlugMapSync();
    const existingSlugs = buildPublishedSlugs();

    // remarkプラグインを返す
    return (tree: Root, file: VFile) => {
        // 現在のファイルのロケールを取得
        const filePath = file?.path || file?.history?.[0] || '';
        const match = filePath.match(/src[\\\/]content[\\\/]wiki[\\\/]([^\\\/]+)/);
        const rawLocale = match?.[1];
        const currentLocale = (rawLocale && isLocale(rawLocale)) ? rawLocale : defaultLocale;

        // テキストノードを走査してWikiリンクを変換
        visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
            // 親ノードやインデックスが存在しない場合はスキップ
            if (!parent || index === undefined) return;

            // 関数内をキャプチャする
            const PATTERN = /\[\[([^\]|#]+)(?:#([^\]|]*))?(?:\|([^\]]*))?\]\]/g;
            const text: string = node.value;
            
            // パターンにマッチしない場合はスキップ
            if (!PATTERN.test(text)) return;
            
            // パターンのインデックスをリセット
            PATTERN.lastIndex = 0;

            const newNodes: any[] = [];
            let lastIndex = 0;
            let m: RegExpExecArray | null;
            // パターンにマッチするすべてのリンクを処理
            while ((m = PATTERN.exec(text)) !== null) {
                // マッチした部分の前のテキストを追加
                if (m.index > lastIndex) {
                    newNodes.push({
                        type: 'text',
                        value: text.slice(lastIndex, m.index)
                    });
                }

                const pageName = m[1].trim();
                const anchor = m[2]?.trim() || '';
                const displayText = m[3]?.trim() || pageName;
                const baseSlug = resolveSlug(pageName, slugMap);

                let targetLocale = defaultLocale;
                let exists = false;

                if (existingSlugs.has(`${currentLocale}/${baseSlug}`)) {
                    // 現在のロケールでページが存在する場合
                    targetLocale = currentLocale;
                    exists = true;
                } else if (existingSlugs.has(`${defaultLocale}/${baseSlug}`)) {
                    // デフォルトロケールでページが存在する場合
                    targetLocale = defaultLocale;
                    exists = true;
                }

                const hash = anchor ? `#${slugify(anchor)}` : '';
                const href = `${base}/${targetLocale}/wiki/${baseSlug}${hash}`;
                
                // リンクノードを追加
                newNodes.push({
                    type: 'link',
                    url: href,
                    data: {
                        hProperties: {
                            class: exists ? 'wikilink' : 'wikilink wikilink-missing',
                            'data-page': baseSlug,
                        },
                    },
                    children: [{
                        type: 'text',
                        value: displayText
                    }],
                });

                lastIndex = m.index + m[0].length;
            }

            // マッチしなかった残りのテキストを追加
            if (lastIndex < text.length) {
                newNodes.push({
                    type: 'text',
                    value: text.slice(lastIndex)
                });
            }

            // ノードを置換
            if (newNodes.length > 0) {
                parent.children.splice(index, 1, ...newNodes);
                return [SKIP, index + newNodes.length];
            }
        });
    };
}