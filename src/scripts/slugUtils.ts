/**
 * @scripts/slugUtils
 * 
 * スラッグ関連のユーティリティ関数
 * 注意: src/lib/slugCore.ts の toRealSlug とは入力形式が異なる
 * (こちらはURLパス文字列、slugCoreはコンテンツIDのフルスラッグを扱う)
 */

/**
 * パスからベーススラッグを取得する
 * @param path パス
 * @returns ベーススラッグ
 */
export function toBaseSlugFromPath(path: string): string {
    // /wiki/ で始まるパスの場合、スラッグ部分を返す
    const wikiMatch = path.match(/\/wiki\/(.+)$/);
    if (wikiMatch) return wikiMatch[1];
    // それ以外の場合、パスからスラッグ部分を抽出して返す
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) return parts.slice(1).join('/');
    return path;
}