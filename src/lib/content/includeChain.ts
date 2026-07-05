/**
 * @lib/content/includeChain.ts
 * includeChainを管理するためのAsyncLocalStorage
 */
import { AsyncLocalStorage } from 'async_hooks';

export const includeChain = new AsyncLocalStorage<Set<string>>();

export function isInChain(fullSlug: string): boolean {
    return includeChain.getStore()?.has(fullSlug) ?? false;
}

export async function withIncludeChain<T>(fullSlug: string, fn: () => Promise<T>): Promise<T> {
    const current = includeChain.getStore() ?? new Set<string>();
    const next = new Set(current);
    next.add(fullSlug);
    return includeChain.run(next, fn);
}