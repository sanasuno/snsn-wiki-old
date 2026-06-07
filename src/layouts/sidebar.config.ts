/**
 * @layouts/sidebar.config.ts
 * サイドバーのナビゲーション設定
 * このファイルを編集してサイドバーの構成を変更できます。
 * 
 * セクションの設定:
 * - titleKey: 翻訳キー（必須）
 * - icon: Font Awesomeのアイコンクラス（省略可）
 * - collapsed: 初期状態で折りたたまれているかどうか（省略可、デフォルトfalse）
 * - items: 手動リンク一覧
 * - category: 指定カテゴリのWikiページを自動収集、itemsが指定されていない場合にのみ有効
 * - autoSort: 'title' | 'order' | 'date' | 'updated' 自動収集時の並び順（省略可、デフォルト'title'）
 * 
 * items 各エントリの設定:
 * - slug: src/content/wiki/ 以下のスラッグ
 * - href: 任意URL（slug がない場合に使用）
 * - i18nKey: 表示名（slug 指定時はページタイトルを直接取得）
 * - icon: Font Awesomeのアイコンクラス（省略可）
 * - external: 外部リンクの場合にtrue（省略可、デフォルトfalse）
 */

export type NavigationItem = {
    slug?: string;
    href?: string;
    i18nKey?: string;
    icon?: string;
    external?: boolean;
};

export type SortMode = 'title' | 'order' | 'date' | 'updated'; // デフォルト: 'title'

export type NavigationSection = {
    titleKey: string;
    icon?: string;
    collapsed?: boolean;
    items?: NavigationItem[];
    category?: string;
    autoSort?: SortMode;
};

/**
 * true にすると、明示されていない全カテゴリをサイドバー末尾に自動追加する
 */
export const autoAddUnknownCategories = true;

export const sidebarNavigation: NavigationSection[] = [
    // -------- クイックリンク（手動） --------
    {
        titleKey: 'sidebar.quickLinks',
        icon: 'fa-solid fa-bolt',
        collapsed: false,
        items: [
            { i18nKey: 'sidebar.home', href: '/', icon: 'fa-solid fa-house' },
            { i18nKey: 'sidebar.graph', href: '/graph', icon: 'fa-solid fa-diagram-project' },
            { i18nKey: 'sidebar.search', href: '/search', icon: 'fa-solid fa-magnifying-glass' },
            { i18nKey: 'sidebar.category', href: '/category', icon: 'fa-solid fa-folder' },
            { i18nKey: 'sidebar.tags', href: '/tags', icon: 'fa-solid fa-tags' },
            { i18nKey: 'sidebar.recent', href: '/recent', icon: 'fa-solid fa-clock-rotate-left' }
        ],
    },

    // -------- サンプル（自動収集） --------
    {
        titleKey: 'sidebar.sampleAuto',
        icon: 'fa-solid fa-book',
        collapsed: true,
        category: 'sample', // src/content/wiki/ 以下の category="sample" のページを収集
        autoSort: 'title', // 'title' | 'order' | 'date' | 'updated' のうちいずれかを指定、デフォルト: 'title'
    },

    // -------- ここにセクションを追加 --------
] satisfies NavigationSection[];