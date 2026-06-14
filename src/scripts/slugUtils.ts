/**
 * @scripts/slugUtils
 * 
 * スラッグ関連のユーティリティ関数
 */

/**
 * パスからベーススラッグを取得する
 * @param path パス
 * @returns ベーススラッグ
 */
export function toBaseSlugFromPath(path: string): string {
    const wikiMatch = path.match(/\wiki\/(.+)$/);
    if (wikiMatch) return wikiMatch[1];
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) return parts.slice(1).join('/');
    return path;
}

/**
 * パスから実際のスラッグを取得する
 * @param path パス
 * @returns 実際のスラッグ
 */
export function toRealSlugFromPath(path: string): string {
    const match = path.match(/\wiki\/(.+)$/);
    if (match) return match[1];
    const parts = path.split('/').filter(Boolean);
    return parts.slice(1).join('/');
}
