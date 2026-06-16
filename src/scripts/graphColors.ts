/**
 * @scripts/graphColors
 * グラフの色を管理するモジュール
 * 注意: ここの getIsDark のロジックは MainLayout.astro の
 * <script is:inline> 内のテーマ初期化ロジックと同一の判定基準
 * (data-theme属性 → OS設定)。片方を変更する際は両方確認すること。
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

/**
 * グラフの色を生成する
 * @returns グラフの色
 */
export function makeColors() {
    const dark = getIsDark();
    return {
        nodeSimple:         dark ? '#4f46e5' : '#6366f1',
        nodeCurrent:        '#f59e0b',
        nodeNeighbor:       dark ? '#4f46e5' : '#6366f1',
        nodeMissing:        dark ? '#374151' : '#e5e7eb',
        nodeStrokeMissing:  dark ? '#4b5563' : '#9ca3af',
        nodeStroke:         dark ? '#0f0f1a' : '#ffffff',
        link:               dark ? '#2d2d4e' : '#e5e7eb',
        linkHi:             dark ? '#818cf8' : '#4f46e5',
        text:               dark ? '#cbd5e1' : '#1f2937',
        textMuted:          dark ? '#64748b' : '#9ca3af',
    };
}
