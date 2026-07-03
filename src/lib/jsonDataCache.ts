import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const cache = new Map<string, any>();

export function loadDataJson<T = any>(name: string): T | null {
    if (cache.has(name)) return cache.get(name);
    const p = resolve(process.cwd(), `src/data/${name}.json`);
    if (!existsSync(p)) {
        cache.set(name, null);
        return null;
    }
    const data = JSON.parse(readFileSync(p, 'utf-8'));
    cache.set(name, data);
    return data as T;
}