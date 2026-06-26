/**
 * @lib/locale.ts
 * ロケール判定ユーティリティ
 */
import { translations, type Locale } from "@i18n/i18n.config";

/**
 * ロケールかどうかを判定する
 * @param lang 判定する文字列
 * @returns ロケールかどうか
 */
export function isLocale(lang: string): lang is Locale {
    return lang in translations;
}