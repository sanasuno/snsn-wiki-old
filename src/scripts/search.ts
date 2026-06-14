/**
 * @scripts/search.ts
 */

import type { SearchEntry } from "./buildSearchIndex";

// ----------------------------------------
// 検索・ハイライト
// ----------------------------------------

/**
 * 正規表現の特殊文字をエスケープする
 * @param s エスケープする文字列
 * @returns エスケープされた文字列
 */
export function escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * テキスト中のクエリをハイライトして返す（HTMLエスケープ込み）
 * @param text ハイライトするテキスト
 * @param query 検索クエリ
 * @returns ハイライトされたテキスト
 */
export function highlight(text: string, query: string): string {
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    if (!query) return escaped;
    const re = new RegExp(`(${escapeRe(query)})`, 'gi');
    return escaped.replace(re, '<mark>$1</mark>');
}

/**
 * 本文中でクエリが最初にヒットする周辺 CONTEXT_CHARS 文字を抽出
 * @param body 本文
 * @param query 検索クエリ
 * @param contextChars コンテキスト文字数
 * @returns 抽出されたテキスト
 */
export function extractSnippet(body: string, query: string, contextChars: number = 60): string {
    if (!query) return body.slice(0, 120);
    const lc = body.toLowerCase();
    const pos = lc.indexOf(query.toLowerCase());
    if (pos === -1) return body.slice(0, 120);
    const start = Math.max(0, pos - contextChars);
    const end   = Math.min(body.length, pos + query.length + contextChars);
    let snippet = body.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < body.length) snippet += '…';
    return snippet;
}

/**
 * 検索を実行する
 * @param query 検索クエリ
 * @param index 検索インデックス
 * @returns 検索結果
 */
export function search(query: string, index: SearchEntry[], maxResults: number = 20) {
    if (!index) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const scored = [];
    for (const entry of index) {
        const titleMatch = entry.title.toLowerCase().includes(q);
        const bodyMatch  = entry.body.toLowerCase().includes(q);
        if (!titleMatch && !bodyMatch) continue;

        // スコア：タイトルヒットを優先
        const score = (titleMatch ? 2 : 0) + (bodyMatch ? 1 : 0);
        scored.push({ entry, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults).map(s => s.entry);
}