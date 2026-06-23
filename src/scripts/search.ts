/**
 * @scripts/search.ts
 * 検索・ハイライト関連のユーティリティ関数
 */

export interface SearchEntry {
    url: string;
    title: string;
    excerpt: string;
    body: string;
}

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
 * @param escapedText HTMLエスケープされたテキスト
 * @param query 検索クエリ
 * @returns ハイライトされたテキスト
 */
export function highlight(escapedText: string, query: string): string {
    if (!query) return escapedText; // クエリがない場合はエスケープされたテキストを返す

    const re = new RegExp(`(${escapeRe(query)})`, 'gi'); // クエリを正規表現でエスケープ
    return escapedText.replace(re, '<mark>$1</mark>'); // マッチした部分をmarkタグで囲む
}

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * 本文中でクエリが最初にヒットする周辺 CONTEXT_CHARS 文字を抽出
 * @param body 本文
 * @param query 検索クエリ
 * @param contextChars コンテキスト文字数
 * @returns 抽出されたテキスト
 */
export function extractSnippet(body: string, query: string, contextChars: number = 40): string {
    const safe = escapeHtml(body);
    
    // クエリがない場合は先頭120文字を返す
    if (!query) return safe.slice(0, 120);

    // 本文を小文字に変換してからクエリの位置を取得
    const lc = body.toLowerCase();
    const pos = lc.indexOf(query.toLowerCase());

    // クエリが見つからない場合は先頭120文字を返す
    if (pos === -1) return safe.slice(0, 120);

    // 開始位置と終了位置を計算
    const start = Math.max(0, pos - contextChars);
    const end   = Math.min(safe.length, pos + query.length + contextChars);

    // スニペットを抽出し、省略されている場合は先頭または末尾に…を追加
    let snippet = safe.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < safe.length) snippet += '…';

    return snippet;
}

/**
 * 検索を実行する
 * @param query 検索クエリ
 * @param index 検索インデックス
 * @param maxResults 最大結果数
 * @returns 検索結果
 */
export function search(query: string, index: SearchEntry[], maxResults: number = 20) {
    // インデックスがない場合は空の配列を返す
    if (!index) return [];

    // クエリをトリムして小文字に変換
    const q = query.trim().toLowerCase();

    // クエリがない場合は空の配列を返す
    if (!q) return [];

    // クエリが含まれるページをスコアリングして結果を格納
    const scored = [];
    for (const entry of index) {
        const titleMatch = entry.title.toLowerCase().includes(q); // タイトルにクエリが含まれるか
        const bodyMatch  = entry.body.toLowerCase().includes(q); // 本文にクエリが含まれるか
        if (!titleMatch && !bodyMatch) continue; // どちらも含まれない場合はスキップ

        // スコア：タイトルヒットを2点、本文ヒットを1点として加算
        const score = (titleMatch ? 2 : 0) + (bodyMatch ? 1 : 0);
        scored.push({ entry, score });
    }

    // スコアで降順にソート
    scored.sort((a, b) => b.score - a.score);

    // 最大結果数に制限して結果を返す
    return scored.slice(0, maxResults).map(s => s.entry);
}