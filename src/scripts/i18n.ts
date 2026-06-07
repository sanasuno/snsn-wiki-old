/**
 * @scripts/i18n.ts
 * i18n 関連のユーティリティ関数
 */

import { translations, type Locale } from '../i18n/i18n.config';
import { savePreference, getPreference } from './storage';

/**
 * Window インターフェースの拡張
 */
interface SnsnWindow {
    lang: Locale;
    i18n: Record<string, string>;
}
declare global {
    interface Window {
        snsn?: SnsnWindow;
    }
}

/**
 * lang が Locale 型かどうかを判定
 * @param lang 対象の文字列
 * @returns Locale 型かどうか
 */
export function isLocale(lang: string): lang is Locale {
    return lang in translations;
}

/**
 * 言語を決定する
 * @param htmlLang HTMLのlang属性
 * @param defaultLocale デフォルト言語
 * @returns 言語
 */
export function resolveLocale(htmlLang: string, defaultLocale: string): Locale {
    if (htmlLang && isLocale(htmlLang)) {
        return htmlLang;
    }
    const savedLang = getPreference('lang');
    if (savedLang && isLocale(savedLang)) {
        return savedLang;
    }
    return defaultLocale as Locale;
}

/**
 * 言語を設定する
 * @param lang 言語
 */
function setLocale(lang: Locale) {
    window.snsn!.lang = lang;
    savePreference('lang', lang);
}

/**
 * i18n データからテキストを取得する
 * @param key i18n データのキー
 * @returns テキストまたは undefined
 */
export function getText(key: string | null, i18n = window.snsn?.i18n): string | undefined {
    if (!key) return undefined;
    return i18n?.[key];
}

/**
 * 言語セレクターを更新する
 */
export function updateLanguageSelector() {
    const selectLang = document.getElementById('lang-list');
    if (selectLang instanceof HTMLSelectElement) {
        selectLang.value = window.snsn?.lang ?? '';
    }
}

/**
 * i18n データを適用する
 */
const handlers: Record<string, (el: Element, text: string) => void> = {
    'data-i18n': (el, text) => {
        el.textContent = text;
    },
    'data-i18n-placeholder': (el, text) => {
        if (el instanceof HTMLInputElement) {
            el.placeholder = text;
        }
    }
};
// handlers で定義された属性を処理
export function applyTranslations() {
    Object.entries(handlers).forEach(([attr, handler]) => {
        document.querySelectorAll(`[${attr}]`).forEach(function(el) {
            const key: string | null = el.getAttribute(attr);
            if (!key) return;
            const text = getText(key);
            if (text !== undefined) {
                handler(el, text);
            }
        });
    });
}

/**
 * i18n UIを更新する
 */
export function refreshI18nUI() {
    updateLanguageSelector();
    applyTranslations();
}

/**
 * i18nを初期化する
 */
export function initI18n() {
    const i18nData: Record<string, Record<string, string>> = translations;
    const htmlLang = document.documentElement.dataset.lang || '';
    const defaultLocale = document.documentElement.dataset.defaultLocale || '';
    // 直後に上書きされる仮置き
    window.snsn ??= {lang: defaultLocale as Locale, i18n: {}};

    // サーバーサイドで決定された lang を localStorage と window.snsn.lang に設定
    // これによりWiki以外のページでも、最後に見たドキュメントの言語がUI言語として保持される
    const resolvedLocale = resolveLocale(htmlLang, defaultLocale);
    setLocale(resolvedLocale);

    // i18nデータを設定
    window.snsn.i18n = i18nData[window.snsn.lang] ?? {};
    
    if (document.readyState === 'loading') {
        // DOMが読み込み中の場合、DOMContentLoadedで更新
        document.addEventListener('DOMContentLoaded', refreshI18nUI);
    } else {
        // 既にDOMが読み込まれている場合
        refreshI18nUI();
    }
}