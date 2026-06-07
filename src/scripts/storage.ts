/**
 * @scripts/storage.ts
 */

/**
 * ローカルストレージに値を保存する
 * @param key ストレージキー
 * @param value ストレージ値
 * @returns 保存に成功した場合true、失敗した場合false
 */
export function savePreference(key: string, value: string): boolean {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error(`Failed to save preference [${key}]:`, error);
        return false;
    }
}

/**
 * ローカルストレージから値を取得する
 * @param key ストレージキー
 * @returns 値、存在しない場合はnull
 */
export function getPreference(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error(`Failed to get preference [${key}]:`, error);
        return null;
    }
}
