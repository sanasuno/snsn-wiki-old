/**
 * src/pages/[locale]/api/graph.json.ts
 * グラフAPI
 */

import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { locales, defaultLocale, type Locale} from '@i18n/i18n.config';
import { extractWikiLinks } from "@lib/wikilinks";
import { toRealSlug, buildSlugMapSync, buildPublishedSlugs } from "@lib/slugmap";
import { isLocale } from "@scripts/i18n";
import type { GraphNode, GraphLink, GraphData } from "@lib/graphTypes";


/**
 * タグからグループ識別子を返す関数
 * @param tags タグ
 * @returns グループ識別子
 */
function tagToGroup(tags: string[]): string {
    return tags[0] || 'untagged';
}

/**
 * グラフデータを構築
 * @param locale 表示優先ロケール
 */
export async function buildGraphData(locale: Locale = defaultLocale): Promise<GraphData> {
    const pages = await getCollection('wiki', (p) => !p.data.draft && !p.data.hidden);
    const slugs = buildPublishedSlugs();
    const map = buildSlugMapSync();

    const nodeMap = new Map<string, GraphNode>();

    // ノードの骨格を構築
    for (const page of pages) {
        const pLocale = page.id.split('/')[0] || defaultLocale;
        const baseSlug = toRealSlug(page.id);

        // ロケールが一致するか、デフォルトロケールで且つ該当ロケールにページが存在しない場合
        // → どちらでもいいのでノードに追加する
        const isMatch = pLocale === locale;
        const isFallback = pLocale === defaultLocale && !slugs.has(`${locale}/${baseSlug}`);
        if (isMatch || isFallback) {
            if (!nodeMap.has(baseSlug)) {
                // ノードがまだない場合、新規作成
                nodeMap.set(baseSlug, {
                    id: baseSlug,
                    label: page.data.title,
                    tags: page.data.tags ?? [],
                    group: tagToGroup(page.data.tags ?? []),
                    linkCount: 0,
                    exists: true,
                });
            } else if (isMatch) {
                // 既に存在するが、現在のロケールで上書きする場合
                const node = nodeMap.get(baseSlug)!;
                node.label = page.data.title;
                node.tags = page.data.tags ?? [];
                node.group = tagToGroup(page.data.tags ?? []);
            }
        }
    }
    // リンクの構築
    const links: GraphLink[] = [];
    const linkSet = new Set<string>();
    for (const page of pages) {
        const sourceFullSlug = page.id;
        const sourceBody = page.body ?? '';
        const rawLocale = sourceFullSlug.split('/')[0];
        const sourceLocale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
        const sourceBaseSlug = toRealSlug(sourceFullSlug);

        // ロケールが一致しない場合、且つ該当ロケールにページが存在する場合はスキップ
        if (sourceLocale !== locale && slugs.has(`${locale}/${sourceBaseSlug}`)) continue;
        // ノードが存在しない場合はスキップ
        if (!nodeMap.has(sourceBaseSlug)) continue;

        const outboundLinks = extractWikiLinks(sourceBody, sourceLocale, slugs, map);
        for (const targetFullSlug of outboundLinks) {
            // 自己リンクはスキップ
            const targetBaseSlug = toRealSlug(targetFullSlug) || targetFullSlug;
            if (sourceBaseSlug === targetBaseSlug) continue;
            // 重複リンクはスキップ
            const linkKey = `${sourceBaseSlug}→${targetBaseSlug}`;
            if (linkSet.has(linkKey)) continue;

            // リンクを追加
            linkSet.add(linkKey);
            links.push({ source: sourceBaseSlug, target: targetBaseSlug });

            // ソースノードのリンク数を増やす
            const sourceNode = nodeMap.get(sourceBaseSlug);
            if (sourceNode) sourceNode.linkCount++;

            // ターゲットノードが存在しない場合は作成
            if (!nodeMap.has(targetBaseSlug)) {
                nodeMap.set(targetBaseSlug, {
                    id: targetBaseSlug,
                    label: targetBaseSlug,
                    tags: [],
                    group: 'untagged',
                    linkCount: 0,
                    exists: false,
                });
            }
            // ターゲットノードのリンク数を増やす
            const targetNode = nodeMap.get(targetBaseSlug);
            if (targetNode) targetNode.linkCount++;
        }
    }

    return {
        nodes: Array.from(nodeMap.values()),
        links,
    };
}

/**
 * 静的パスを生成
 * @returns ロケールごとのパス
 */
export async function getStaticPaths() {
    return locales.map(locale => ({ params: { locale } }));
}

/**
 * グラフデータを取得
 * @param パラメータ
 * @returns グラフデータ
 */
export const GET: APIRoute = async({ params }) => {
    const rawLocale = params.locale;
    // ロケールが存在しない、または無効な場合は404を返す
    if (!rawLocale || !isLocale(rawLocale)) {
        return new Response ('Not Found', { status: 404});
    }
    // グラフデータを取得し、JSONとして返す
    const data = await buildGraphData(rawLocale);
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
    }); 
};