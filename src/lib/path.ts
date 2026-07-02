/**
 * @scripts/utils
 * 共通のユーティリティ関数
 */
import { locales, type Locale } from "@i18n/i18n.config";

/**
 * URL末尾のスラッシュを削除する関数
 * @param path URLパス
 * @returns スラッシュを削除したパス
 */
export function removeTrailingSlash(path: string): string {
    return path.replace(/\/+$/, '');
}

/**
 * スラッグからルートを取得する関数
 * @param pageId ページID
 * @returns ルートスラッグ
 */
export function getBaseSlug(pageId: string): string {
    const parts = pageId.split('/');
    // ロケールが含まれている場合、それを削除して残りを結合する
    if ( parts.length > 1 && locales.includes(parts[0] as Locale)) {
        return parts.slice(1).join('/');
    }
    return pageId;
}

/**
 * ページIDからルートを取得する関数
 * @param pageId ページID
 * @param wikiBaseUrl ウィキベースURL
 * @returns ルート
 */
export function getRoute(pageId: string, wikiBaseUrl: string): string {
    const baseSlug = getBaseSlug(pageId);
    return removeTrailingSlash(`${wikiBaseUrl}/${baseSlug}`);
}