/**
 * @srcipts/pages.ts
 * 
 * ページ関連のユーティリティ関数
 */

/**
 * ロケールに基づいたベーススラッグごとのユニークページを取得する
 * @param pages - 全ページ
 * @param locale - 現在のロケール
 * @returns ベーススラッグごとのユニークページ
 */
import type { Locale } from "@i18n/i18n.config";
import type { CollectionEntry } from "astro:content";

/**
 * ロケールに基づいたベーススラッグごとのユニークページを取得する
 * @param pages - 全ページ
 * @param locale - 現在のロケール
 * @returns ベーススラッグごとのユニークページ
 */
export function getUniquePagesByLocale(
    pages: CollectionEntry<'wiki'>[],
    locale: Locale
): CollectionEntry<'wiki'>[] {
    const uniquePagesByBaseSlug: Record<string, CollectionEntry<'wiki'>> = {};
    for (const page of pages) {
        // ページIDをスラッグに分割し、ロケールとベーススラッグを取得
        const parts = page.id.split('/');
        const pLocale = parts[0];
        const baseSlug = parts.slice(1).join('/');
        
        // ベーススラッグがまだ登録されていない場合、または現在のロケールの場合、ページを登録
        if (!uniquePagesByBaseSlug[baseSlug]) {
            uniquePagesByBaseSlug[baseSlug] = page;
        } else if (pLocale === locale) {
            uniquePagesByBaseSlug[baseSlug] = page;
        }
    }
    return Object.values(uniquePagesByBaseSlug);
}