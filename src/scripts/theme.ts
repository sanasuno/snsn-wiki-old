/**
 * @scripts/theme.ts
 * テーマ切替スクリプト
 */

import { savePreference } from "@scripts/storage";

/**
 * テーマトグル設定
 */
export function setupThemeToggle() {
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = 
            currentTheme === 'dark' || 
            (!currentTheme && prefersDark);
        const nextTheme = 
            isDark 
                ? 'light' 
                : 'dark';
        
        html.setAttribute('data-theme', nextTheme);
        savePreference('theme', nextTheme);
    });
}
