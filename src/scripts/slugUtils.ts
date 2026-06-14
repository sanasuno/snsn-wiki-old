/**
 * @scripts/slugUtils
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
