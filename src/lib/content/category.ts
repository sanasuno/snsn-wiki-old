/**
 * @scripts/category
 * カテゴリ関連のユーティリティ関数
 */

/**
 * IDからカテゴリを取得する関数
 * @param id ページのID
 * @returns カテゴリ名の配列
 */
export function getCategoryFromId(id: string): string[] {
    const parts = id.split('/');
    // ページのIDは {locale}/{category1}/{category2}/.../{slug} の形式であるため、2番目以降の要素がカテゴリとなる
    if (parts.length > 2) {
        return parts.slice(1, -1);
    }
    return [];
}

/**
 * カテゴリが一致するかチェックする関数
 * @param pageCategories ページのカテゴリ
 * @param filterCategories フィルタリングするカテゴリ
 * @returns 一致するか
 */
export function matchCategory(pageCategories: string[], filterCategories: string[]): boolean {
    if (filterCategories.length === 0) {
        // フィルタリングするカテゴリが指定されていない場合は、すべてのページを表示する
        return true;
    }
    // ページのカテゴリとフィルタリングするカテゴリが一致するかチェックする
    return filterCategories.every((category, i) =>
        pageCategories[i] === category
    );
}