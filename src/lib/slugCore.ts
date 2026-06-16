/**
 * @lib/slugCore
 * fs/path に依存しない純粋なスラッグ変換ロジック
 */

/**
 * テキストをスラッグに変換する
 * @param text 変換するテキスト
 * @returns スラッグ
 */
export function slugify(text: string): string {
    return text
        .trim() // 先頭と末尾の空白を削除
        .toLowerCase() // 小文字に変換
        .replace(/[^\p{L}\p{N}\s-]/gu, '') // 特殊文字を削除
        .replace(/[\s_-]+/g, '-') // スペースとアンダースコアをハイフンに変換
        .replace(/^-+|-+$/g, ''); // 先頭と末尾のハイフンを削除
}

/**
 * フルスラッグから実際のスラッグを取得する
 * @param fullSlug フルスラッグ
 * @returns 実際のスラッグ
 */
export function toRealSlug(fullSlug: string): string {
    const parts = fullSlug.split('/');
    if (parts.length < 2) return '';
    return parts.slice(1).join('/');
}

export type SlugMap = Record<string, string>;

/**
 * スラッグを解決する
 * @param text テキスト
 * @param map スラッグマップ
 * @returns スラッグ
 */
export function resolveSlug(text: string, map: SlugMap): string {
    const key = slugify(text);
    return map[key] || text;
}
