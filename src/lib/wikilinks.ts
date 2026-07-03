/**
 * @lib/wikilinks.ts
 * [[Page Name]] や [[Page Name|表示名]] [[Page Name#section]] などのWikiリンクを処理するremarkプラグイン
 */
import { visit, SKIP } from 'unist-util-visit';
import type { Root} from 'mdast';
import type { VFile } from 'vfile'
import { defaultLocale, type Locale } from '../i18n/i18n.config';
import { isLocale } from './locale';
import { slugify, buildSlugMapSync, buildPublishedSlugs, resolveSlug, type SlugMap } from './slug/slugmap';

const WIKILINK_PATTERN_SOURCE = '\\[\\[([^\\]|#]+)(?:#([^\\]|]*))?(?:\\|([^\\]]*))?\\]\\]';

// ==============================
// WikiLink 抽出（静的解析用）
// ==============================

/**
 * コードブロック・インラインコードの中身を除去する
 * @param text 
 * @returns 
 */
function stripCodeSpans(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, '') // フェンス付きコードブロックを除去
        .replace(/`[^`\n]+`/g, ''); // インラインコードを除去
}


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
    // スラッグマップとスラッグセットを取得
    const map = slugMap || buildSlugMapSync();
    const slugs = existingSlugs || buildPublishedSlugs();
    const links: string[] = [];
    
    const cleanBody = stripCodeSpans(body);
    
    // regexでマッチしたすべてのWikiリンクを処理
    let match: RegExpExecArray | null;
    const PATTERN = new RegExp(WIKILINK_PATTERN_SOURCE, 'g'); // [[Page Name]] や [[Page Name|表示名]] [[Page Name#section]] などのWikiリンク
    while ((match = PATTERN.exec(cleanBody)) !== null) {
        // ページ名からスラッグを取得
        const pageName = match[1].trim();
        const rawSlug = resolveSlug(pageName, map);
        // スラッグが存在する場合はそのスラッグを使用、存在しない場合はページ名をslugifyしてスラッグとする
        const baseSlug = slugs.has(`${sourceLocale}/${rawSlug}`) || slugs.has(`${defaultLocale}/${rawSlug}`)
            ? rawSlug
            : slugify(pageName);
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
 * @param options.base ベースパス（オプション、例: '/wiki'）
 */
export function remarkWikiLinks(options: { base?: string } = {}) {
    // 末尾のスラッシュを除去してベースパスを正規化
    const base = options.base?.replace(/\/$/, '') ?? '';
    // ビルド時に同期的にスラッグマップと公開済みスラッグの情報を取得
    const slugMap = buildSlugMapSync();
    const existingSlugs = buildPublishedSlugs();

    // Unified / Remark のプラグイン関数を返す
    return (tree: Root, file: VFile) => {
        // 現在処理しているMarkdownファイルの絶対パスを取得
        const filePath = file?.path || file?.history?.[0] || '';
        // ファイルパスから現在のロケール（言語コード、例: 'ja' または 'en'）を抽出
        const match = filePath.match(/src[\\\/]content[\\\/]wiki[\\\/]([^\\\/]+)/);
        const rawLocale = match?.[1];
        const currentLocale = (rawLocale && isLocale(rawLocale)) ? rawLocale : defaultLocale;

        // mdast（Markdown抽象構文木）内のすべての 'text' ノードを走査
        visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
            // 親ノードやインデックスが存在しない場合は処理できないためスキップ
            if (!parent || index === undefined) return;

            // [[Page Name]] 形式のパターン
            const PATTERN = new RegExp(WIKILINK_PATTERN_SOURCE, 'g');
            const text: string = node.value;
            // 該当するテキスト内にWikiリンクが1つも含まれていない場合はスキップ
            if (!PATTERN.test(text)) return;
            
            // 正規表現の検索位置インデックスを初期化
            PATTERN.lastIndex = 0;

            const newNodes: any[] = [];
            let lastIndex = 0;
            let m: RegExpExecArray | null;

            // マッチするすべてのWikiLink記法を順に処理
            while ((m = PATTERN.exec(text)) !== null) {
                // WikiLinkの直前にあるプレーンテキストを新規テキストノードとして追加
                if (m.index > lastIndex) {
                    newNodes.push({
                        type: 'text',
                        value: text.slice(lastIndex, m.index)
                    });
                }

                const pageName = m[1].trim(); // リンク先ページ名（またはエイリアス名）
                const anchor = m[2]?.trim() || ''; // # 以降の目次アンカー
                const displayText = m[3]?.trim() || pageName; // 表示テキスト（|の右側、なければページ名）
                const baseSlug = resolveSlug(pageName, slugMap); // ページ名から実際のスラッグを逆引き

                let targetLocale = defaultLocale;
                let exists = false;

                // リンク先の存在チェックとロケール判定
                if (existingSlugs.has(`${currentLocale}/${baseSlug}`)) {
                    // 現在のページのロケールにリンク先ページが存在する場合
                    targetLocale = currentLocale;
                    exists = true;
                } else if (existingSlugs.has(`${defaultLocale}/${baseSlug}`)) {
                    // 現在のロケールにはないが、デフォルトロケールに存在する場合（フォールバック）
                    targetLocale = defaultLocale;
                    exists = true;
                }

                // 目次アンカーがある場合はスラッグ化してハッシュを構築
                const hash = anchor ? `#${slugify(anchor)}` : '';
                const href = `${base}/${targetLocale}/wiki/${baseSlug}${hash}`;
                
                // HTMLのAタグに相当する 'link' ノードを生成して追加
                newNodes.push({
                    type: 'link',
                    url: href,
                    data: {
                        hProperties: {
                            // リンク先が存在しない場合は 'wikilink-missing' クラスを付与し、スタイル（例: 赤文字）で表現可能にする
                            class: exists ? 'wikilink' : 'wikilink wikilink-missing',
                            'data-page': baseSlug,
                        },
                    },
                    children: [{
                        type: 'text',
                        value: displayText
                    }],
                });

                // マッチした部分の末尾までインデックスを進める
                lastIndex = m.index + m[0].length;
            }

            // 最後のWikiLinkの後ろにある残りのプレーンテキストを追加
            if (lastIndex < text.length) {
                newNodes.push({
                    type: 'text',
                    value: text.slice(lastIndex)
                });
            }

            // 親ノードの子供リストにある元の 'text' ノードを、分割・生成した新しいノード群で置換する
            if (newNodes.length > 0) {
                parent.children.splice(index, 1, ...newNodes);
                // 置換後のツリー走査で無限ループを防ぐため、追加した分のノード数をスキップする
                return [SKIP, index + newNodes.length];
            }
        });
    };
}