/**
 * @i18n/i18n.config.ts
 * i18n 設定ファイル
 * 
 * 言語を追加する際は、src/i18n/ に翻訳ファイルを追加し、
 * このファイルにインポートを追加し、日付フォーマット用の文字列を追加する
 * デフォルトロケールを変更したい場合は、defaultLocale を変更する
 */

// i18nフォルダ内の翻訳ファイルをインポート
// 言語追加時はここにインポートを追加する
import { ja } from './ja';
import { en } from './en';

// 翻訳ファイルをまとめる
// 言語追加時はここに追加する
export const translations = {
  ja,
  en
} as const;
// 翻訳ファイルからロケール型を生成
export type Locale = keyof typeof translations;
// 利用可能なロケール配列
export const locales = Object.keys(translations) as Locale[];

// ロケールに対応する日付フォーマット用の文字列を生成
// 言語追加時はここに追加する
const dateLocaleMap: Record<Locale, string> = {
  ja: 'ja-JP',
  en: 'en-US',
};

// デフォルトロケールを指定
// デフォルトロケールを変更したい場合は、ここを変更する
export const defaultLocale: Locale = 'ja';

// ロケールの数が2つ以上ある場合に言語切替ボタンを表示する
export const showLanguageSwitcher: boolean = locales.length > 1;

// 翻訳キーの型定義
// デフォルトロケールのキーのみを許可する
export type TranslationKey = keyof typeof translations[typeof defaultLocale];

/**
 * 翻訳キーから翻訳された文字列を返す関数
 * @param key 翻訳キー
 * @param locale ロケール
 * @returns 翻訳された文字列
 */
export function t(key: TranslationKey, locale: Locale = defaultLocale): string {
    return (translations[locale] as Record<string, string>)?.[key] 
      ?? (translations[defaultLocale] as Record<string, string>)?.[key] 
      ?? key;
}

/**
 * 動的な翻訳キーから翻訳された文字列を返す関数
 * @param prefix 翻訳キーのプレフィックス
 * @param name 翻訳キーの名前
 * @param locale ロケール
 * @returns 翻訳された文字列
 */
export function tDynamic(prefix: string, name: string, locale: Locale = defaultLocale) {
  const key = `${prefix}.${name}` as TranslationKey;
  const translated = t(key, locale);
  return translated !== key ? translated : name;
}

/**
 * ロケールに適した日付形式で日付をフォーマットする関数
 * @param date 日付
 * @param locale ロケール
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: Date, locale: Locale = defaultLocale): string {
    return date.toLocaleDateString(dateLocaleMap[locale], {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
}