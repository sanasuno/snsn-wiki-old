/**
 * src/pages/[lang]/api/graph.json.ts
 * グラフAPI
 */

import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { locales, defaultLocale, type Locale} from '@i18n/i18n.config';
import { extractWikiLinks } from "@lib/wikilinks";
import { toRealSlug, buildSlugMapSync, buildPublishedSlugs } from "@lib/slugmap";
import { isLocale } from "@scripts/i18n";

export interface GraphNode {
    id: string;
    label: string;
    tags: string[];
    group: string; // タグによるグループ色分け用
    linkCount: number;
    exists: boolean;
}

export interface GraphLink {
    source: string;
    target: string;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

/**
 * タグからグループ識別子を返す
 * @param tags タグ
 * @returns 
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

        const isMatch = pLocale === locale;
        const isFallback = pLocale === defaultLocale && !slugs.has(`${locale}/${baseSlug}`);

        if (isMatch || isFallback) {
            if (!nodeMap.has(baseSlug)) {
                nodeMap.set(baseSlug, {
                    id: baseSlug,
                    label: page.data.title,
                    tags: page.data.tags ?? [],
                    group: tagToGroup(page.data.tags ?? []),
                    linkCount: 0,
                    exists: true,
                });
            } else if (isMatch) {
                const node = nodeMap.get(baseSlug)!;
                node.label = page.data.title;
                node.tags = page.data.tags ?? [];
                node.group = tagToGroup(page.data.tags ?? []);
            }
        }
    }

    const links: GraphLink[] = [];
    const linkSet = new Set<string>();

    // リンクの構築
    for (const page of pages) {
        const sourceFullSlug = page.id;
        const sourceBody = page.body ?? '';
        const rawLocale = sourceFullSlug.split('/')[0];
        const sourceLocale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
        const sourceBaseSlug = toRealSlug(sourceFullSlug);

        if (sourceLocale !== locale && slugs.has(`${locale}/${sourceBaseSlug}`)) {
            continue;
        }
        
        if (!nodeMap.has(sourceBaseSlug)) continue;

        const outboundLinks = extractWikiLinks(sourceBody, sourceLocale, slugs, map);

        for (const targetFullSlug of outboundLinks) {
            const targetBaseSlug = toRealSlug(targetFullSlug) || targetFullSlug;
            if (sourceBaseSlug === targetBaseSlug) continue;

            const linkKey = `${sourceBaseSlug}→${targetBaseSlug}`;
            if (linkSet.has(linkKey)) continue;

            linkSet.add(linkKey);
            links.push({ source: sourceBaseSlug, target: targetBaseSlug });

            const sourceNode = nodeMap.get(sourceBaseSlug);
            if (sourceNode) sourceNode.linkCount++;

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

            const targetNode = nodeMap.get(targetBaseSlug);
            if (targetNode) targetNode.linkCount++;
        }
    }

    return {
        nodes: Array.from(nodeMap.values()),
        links,
    };
}

export async function getStaticPaths() {
    return locales.map(locale => ({ params: { locale } }));
}

export const GET: APIRoute = async({ params }) => {
    const rawLocale = params.locale;
    if (!rawLocale || !isLocale(rawLocale)) {
        return new Response ('Not Found', { status: 404});
    }
    const data = await buildGraphData(rawLocale);

    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
    }); 
};