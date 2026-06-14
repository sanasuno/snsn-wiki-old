/**
 * @scripts/graphColors
 * グラフの色を管理するモジュール
 */

/**
 * ダークモードかどうかを判定する
 * @returns ダークモードかどうか
 */
export function getIsDark(): boolean {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function makeColors() {
    const dark = getIsDark();
    return {
        nodeSimple:         dark ? '#4f46e5' : '#6366f1',
        nodeCurrent:        '#f59e0b',
        nodeMissing:        dark ? '#374151' : '#e5e7eb',
        nodeStrokeMissing:  dark ? '#4b5563' : '#9ca3af',
        nodeStroke:         dark ? '#0f0f1a' : '#ffffff',
        link:               dark ? '#2d2d4e' : '#e5e7eb',
        linkHi:             dark ? '#818cf8' : '#4f46e5',
        text:               dark ? '#cbd5e1' : '#1f2937',
        textMuted:          dark ? '#64748b' : '#9ca3af',
    };
}
