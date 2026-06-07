/**
 * @scripts/toc.ts
 * TOC操作スクリプト
 */

// TOCのアクティブ状態更新
export function setupToc() {
    const tocLinks = document.querySelectorAll('.toc-nav a');
    if (tocLinks.length > 0) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const id = entry.target.id;
                    const link = document.querySelector(`.toc-nav a[href="#${id}"]`);
                    if (entry.isIntersecting) {
                        tocLinks.forEach(l => l.classList.remove('active'));
                        link?.classList.add('active');
                    }
                });
            },
            { rootMargin: '-20% 0% -70% 0%' }
        );
        // 各見出しを監視対象に追加
        document.querySelectorAll('.main-content h2, .main-content h3, .main-content h4').forEach(
            heading => {
                observer.observe(heading);
            }
        );
    }
}

export function setupTocDrawer() {
    const tocPanel = document.getElementById('toc-panel');
    const tocDrawerButton = document.getElementById('toc-drawer-button');
    tocDrawerButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        tocPanel?.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
        if (
            tocPanel?.classList.contains('open') && 
            !tocPanel.contains(e.target as Node) &&
            !tocDrawerButton?.contains(e.target as Node) &&
            e.target !== tocDrawerButton
        ) {
            tocPanel.classList.remove('open');
        }
    });
}