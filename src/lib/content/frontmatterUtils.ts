/**
 * @lib/content/frontmatterUtils.ts
 * Frontmatter関連のユーティリティ関数
 */
import { parseFrontmatter } from "astro/markdown";

/**
 * Frontmatterをパースした結果の型
 */
export interface ParsedFrontMatter {
    meta: Record<string, unknown>;
    body: string;
}

/**
 * 改行を正規化してFrontmatterをパースする
 * @param raw - 生のMarkdownテキスト
 * @returns パース結果
 */
export function parseNormalizedFrontmatter(raw: string): ParsedFrontMatter {
    const normalized = raw.replace(/\r\n/g, '\n');
    const parsed = parseFrontmatter(normalized);
    return {
        meta: (parsed?.frontmatter as Record<string, unknown>) ?? {},
        body: parsed?.content ?? normalized,
    };
}