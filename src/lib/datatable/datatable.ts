import { buildSlugMapSync } from "@lib/slug/slugmap";

export type ColumnDef = {
    key: string
    label: string
    align?: 'left' | 'center' | 'right'
    sortable?: boolean
    html?: boolean
}

export type FilterDef = {
    key: string
    label: string
    split?: string
}

export type TransformDef =
    | { type: 'stars'; max?: number }
    | { type: 'badge'; colors?: Record<string, { bg: string; color: string }> }
    | { type: 'tags'; split?: string }
    | { type: 'link'; hrefField?: string; basePath?: string }

export type TableConfig = {
    columns: ColumnDef[]
    filters?: FilterDef[]
    defaultSort?: string
    defaultAsc?: boolean
    transform?: Record<string, TransformDef>
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]!
    })
}

export function transformCell(
    key: string,
    row: Record<string, any>,
    transform: Record<string, TransformDef>,
    src: string,
    base: string
): { display: string; raw: string } {
    const val = row[key];
    const t = transform[key];

    if (!t) {
        const s = val == null ? '' : String(val);
        return { display: escapeHtml(s), raw: s };
    }

    switch (t.type) {
        case 'stars': {
            const n = parseInt(val, 10);
            const max = t.max ?? 5;
            const filled = Math.max(0, Math.min(Number.isNaN(n) ? 0 : n, max));
            return {
                display: `<span style="color: #f59e0b; letter-spacing: 1px;">${'★'.repeat(filled)}${'☆'.repeat(max - filled)}</span>`,
                raw: String(Number.isNaN(n) ? 0 : n)
            }
        }
        case 'badge': {
            const s = val == null ? '' : String(val);
            const col = t.colors?.[s] ?? {
                bg: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
            }
            return {
                display: `<span style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: ${col.bg}; color: ${col.color};">${escapeHtml(s)}</span>`,
                raw: s
            }
        }
        case 'tags': {
            const tags: string[] = Array.isArray(val)
                ? val
                : String(val ?? '')
                    .split(t.split ?? ',')
                    .map((v: string) => v.trim())
                    .filter(Boolean)
            return {
                display: tags.map(tag =>
                    `<span style="display: inline-block; padding: 1px 7px; border: 1px solid var(--color-border); border-radius: 999px; font-size: 0.7rem; font-weight: 600; background: var(--color-bg-secondary); color: var(--color-text); margin: 1px;">${escapeHtml(tag)}</span>`
                ).join(' '),
                raw: tags.join(t.split ?? ', ')
            }
        }
        case 'link': {
            const label = val == null ? '' : String(val).trim();
            const hrefField = t.hrefField ?? key;
            const hrefValue = row[hrefField] ?? label;
            const slugMap = buildSlugMapSync();
            const slug = row.slug ?? slugMap[hrefValue] ?? hrefValue;
            const href = t.basePath
                ? `${t.basePath.replace(/\/$/, '')}/${slug}`
                : `${base}/wiki/${src}/${slug}`
            return {
                display: `<a href="${escapeHtml(href)}" style="font-weight: 600; color: var(--color-link); text-decoration: none;">${escapeHtml(label)}</a>`,
                raw: label
            }
        }
        default: {
            const s = val == null ? '' : String(val);
            return { display: escapeHtml(s), raw: s };
        }
    }
}
