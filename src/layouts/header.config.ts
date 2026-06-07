/**
 * @layouts/header.config.ts
 * ヘッダーのナビゲーション設定
 * このファイルを編集してヘッダーの構成を変更できます。
 */
import type { t } from "@i18n/i18n.config";

export type NavItem = {
    path: string;
    icon: string;
    i18nKey: Parameters<typeof t>[0];
}

export const headerNavigation: NavItem[] = [
    { path: '/', icon: 'fa-solid fa-house', i18nKey: 'nav.home' },
    { path: '/category', icon: 'fa-solid fa-folder', i18nKey: 'nav.category' },
    { path: '/tags', icon: 'fa-solid fa-tags', i18nKey: 'nav.tags' },
    { path: '/graph', icon: 'fa-solid fa-diagram-project', i18nKey: 'nav.graph' }
];