/**
 * @scripts/category
 * カテゴリ関連のユーティリティ関数
 */

/**
 * IDからカテゴリを取得する
 * @param id ページのID
 * @returns カテゴリ名の配列
 */
export function getCategoryFromId(id: string): string[] {
    const parts = id.split('/');
    if (parts.length > 2) {
        return parts.slice(1, -1);
    }
    return [];
}

export function matchCategory(pageCategories: string[], filterCategories: string[]): boolean {
    if (filterCategories.length === 0) {
        return true;
    }
    return filterCategories.every(
        (category, i) => pageCategories[i] === category
    );
}