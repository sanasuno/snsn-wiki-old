/**
 * @scripts/pagefilter.ts
 */

export function initPageFilter() {
    const chips = document.querySelectorAll<HTMLButtonElement>('.tag-chip'); // タグチップ
    const entries = document.querySelectorAll<HTMLElement>('.page-entry'); // ページエントリー
    const clearBtn = document.getElementById('tag-filter-clear') as HTMLButtonElement | null; // フィルタークリアボタン
    const statusEl = document.getElementById('tag-filter-status') as HTMLElement | null; // フィルターステータス
    const emptyEl = document.getElementById('pages-empty') as HTMLElement | null; // 空のページ
    const modeAndBtn = document.getElementById('tag-mode-and') as HTMLButtonElement | null; // ANDモードボタン
    const modeOrBtn = document.getElementById('tag-mode-or') as HTMLButtonElement | null; // ORモードボタン

    const selected = new Set<string>();
    let mode: 'and' | 'or' = 'and';

    /**
     * フィルターを適用する
     */
    function applyFilter() {
        const hasFilter = selected.size > 0;
        // フィルタークリアボタンの表示/非表示
        if (clearBtn) clearBtn.hidden = !hasFilter;

        let visibleCount = 0;
        entries.forEach((entry) => {
            const tags: string[] = JSON.parse(entry.dataset.tags ?? '[]');
            let visible: boolean;
            // フィルターがない場合は全て表示
            if (!hasFilter) {
                visible = true;
            } else if (mode === 'and') {
                // ANDモード: 全てのタグが選択されている場合のみ表示
                visible = [...selected].every(t => tags.includes(t));
            } else {
                // ORモード: いずれかのタグが選択されている場合のみ表示
                visible = [...selected].some(t => tags.includes(t));
            }

            // 表示状態を設定
            if (visible) {
                entry.removeAttribute('data-hidden');
                visibleCount++;
            } else {
                entry.setAttribute('data-hidden', '');
            }
        });

        // ステータス表示
        if (statusEl) {
            // フィルターがある場合、表示件数を表示する
            if (hasFilter) {
                statusEl.hidden = false;
                statusEl.textContent = `${visibleCount} / ${entries.length}`;
            } else {
                statusEl.hidden = true;
            }
        }

        if (emptyEl) emptyEl.hidden = visibleCount > 0;
    }

    /**
     * モードを設定する
     * @param next モード
     */
    function setMode(next: 'and' | 'or') {
        mode = next;
        modeAndBtn?.setAttribute('aria-pressed', String(next === 'and')); // ANDモードに設定
        modeOrBtn?.setAttribute('aria-pressed', String(next === 'or')); // ORモードに設定
        modeAndBtn?.classList.toggle('tag-mode-btn--active', next === 'and'); // ANDモードのボタンにアクティブクラスを付与
        modeOrBtn?.classList.toggle('tag-mode-btn--active', next === 'or'); // ORモードのボタンにアクティブクラスを付与
        applyFilter();
    }

    // モードボタンのイベントリスナーを設定
    modeAndBtn?.addEventListener('click', () => setMode('and'));
    modeOrBtn?.addEventListener('click', () => setMode('or'));

    // タグチップのイベントリスナーを設定
    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            const tag = chip.dataset.tag ?? '';
            // 選択状態を切り替える
            if (selected.has(tag)) {
                selected.delete(tag);
                chip.setAttribute('aria-pressed', 'false');
            } else {
                selected.add(tag);
                chip.setAttribute('aria-pressed', 'true');
            }
            applyFilter();
        });
    });

    // クリアボタンのイベントリスナーを設定
    clearBtn?.addEventListener('click', () => {
        selected.clear();
        chips.forEach(c => c.setAttribute('aria-pressed', 'false'));
        applyFilter();
    });
};