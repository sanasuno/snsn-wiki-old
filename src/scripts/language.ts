/**
 * @scripts/language.ts
 * 言語切替スクリプト
 */
import { savePreference } from '@scripts/storage';
import { defaultLocale } from '@i18n/i18n.config';

// 言語スイッチャーをセットアップ
export function setupLanguageSwitcher() {
    const langSelect = document.getElementById('lang-list');
    if (!(langSelect instanceof HTMLSelectElement)) {
        return;
    }
    langSelect.addEventListener('change', () => {
        const nextLang = langSelect.value;
        savePreference('lang', nextLang);

        // Link要素から対応する言語のURLを取得
        const altLink = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${nextLang}"]`);
        if (altLink?.href) {
            // 次の言語のページが存在すれば遷移する
            window.location.assign(altLink.href);
            return;
        }
        const rootLink = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${defaultLocale}"]`);
        if (rootLink?.href) {
            // デフォルト言語のページが存在すれば遷移する
            window.location.assign(rootLink.href);
            return;
        }
        // どちらも存在しない場合はリロードしてUI言語設定だけ適用
        window.location.reload();
    });
}