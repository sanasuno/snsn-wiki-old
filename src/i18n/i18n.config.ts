/**
 * @i18n/i18n.config.ts
 * i18n 設定ファイル
 * 言語を追加する際は、src/i18n/ に翻訳ファイルを追加し、
 * translations オブジェクトに追加する
 */

// i18nフォルダ内の翻訳ファイルをインポート
import { ja } from './ja';
import { en } from './en';

// ロケール定義
export const translations = {
  ja,
  en
} as const;
// ロケール型
export type Locale = keyof typeof translations;
// 利用可能なロケール配列
export const locales = Object.keys(translations) as Locale[];
// ロケールに対応する日付フォーマット用の文字列
const dateLocaleMap: Record<Locale, string> = {
  ja: 'ja-JP',
  en: 'en-US',
};

// デフォルトロケール指定
export const defaultLocale: Locale = 'ja';

// 言語切替ボタンを表示するか
export const showLanguageSwitcher: boolean = locales.length > 1;

// 与えられた言語とキーから翻訳を返す関数
export function t(key: string, locale: Locale = defaultLocale): string {
    return (translations[locale] as Record<string, string>)?.[key] 
      ?? (translations[defaultLocale] as Record<string, string>)?.[key] 
      ?? key;
}

// ロケールに適した日付形式で日付をフォーマットする関数
export function formatDate(date: Date, locale: Locale = defaultLocale): string {
    return date.toLocaleDateString(dateLocaleMap[locale], {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
}