import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// キャッシュの型定義
type CacheEntry<T> = { data: T | null; mtime: number }
const cache = new Map<string, CacheEntry<any>>();

/**
 * JSONファイルを読み込み、キャッシュする
 * @param name JSONファイル名
 * @returns JSONデータ
 */
export function loadDataJson<T = any>(name: string): T | null {
    if (cache.has(name)) return cache.get(name)!.data;
    const p = resolve(process.cwd(), `src/data/${name}.json`);
    // ファイルが存在しない場合、キャッシュにnullを設定して返す
    if (!existsSync(p)) {
        cache.set(name, { data: null, mtime: 0 });
        return null;
    }

    const mtime = statSync(p).mtimeMs;
    const cached = cache.get(name);
    // キャッシュが存在し、ファイルが更新されていない場合、キャッシュを返す
    if (cached && cached.mtime === mtime) {
        return cached.data;
    }

    // ファイルを読み込み、キャッシュに保存
    const data = JSON.parse(readFileSync(p, 'utf-8'));
    cache.set(name, { data, mtime });
    return data as T;
}