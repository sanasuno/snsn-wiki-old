/**
 * @scripts/sidebar.ts
 * サイドバー操作スクリプト
 */
import { getPreference, savePreference } from "@scripts/storage";

// モバイルサイドバーボタン
export function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    sidebarToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar?.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
        if (
            sidebar?.classList.contains('open') && 
            !sidebar.contains(e.target as Node) &&
            !sidebarToggle?.contains(e.target as Node) &&
            e.target !== sidebarToggle
        ) {
            sidebar.classList.remove('open');
        }
    });
}

// サイドバーの折りたたみ/展開ボタン
export function setupSidebarToggle() {
    document.querySelectorAll<HTMLButtonElement>('[data-storage-key]').forEach(button => {
        // data-storage-key 属性からキーを取得
        const key = button.dataset.storageKey;
        if (!key) return;
        const nav = button.nextElementSibling as HTMLElement | null;
        if (!nav) return;

        // ローカルストレージから保存された状態を読み込み
        const saved  = getPreference(key);
        if (saved !== null) {
            const isCollapsed = saved === 'true';
            button.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            nav.classList.toggle('collapsed', isCollapsed);
        }

        // クリック時に状態を切り替えてローカルストレージに保存
        button.addEventListener('click', () => {
            const isExpanded = 
                button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
            nav.classList.toggle('collapsed', isExpanded);
            savePreference(key, isExpanded ? 'true' : 'false');
        });
    });
}