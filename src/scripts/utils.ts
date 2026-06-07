/**
 * @scripts/utils
 * 共通のユーティリティ関数
 */
import { locales, type Locale } from "@i18n/i18n.config";

// URL末尾のスラッシュを削除する関数
export function removeTrailingSlash(path: string): string {
    return path.replace(/\/+$/, '');
}

// スラッグからルートを取得する関数
export function getBaseSlug(pageId: string): string {
    const parts = pageId.split('/');
    if ( parts.length > 1 && locales.includes(parts[0] as Locale)) {
        return parts.slice(1).join('/');
    }
    return pageId;
}

export function getRoute(pageId: string, wikiBaseUrl: string): string {
    const baseSlug = getBaseSlug(pageId);
    return removeTrailingSlash(`${wikiBaseUrl}/${baseSlug}`);
}