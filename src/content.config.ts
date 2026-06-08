/**
 * src/content.config.ts
 * Astroのコンテンツ設定ファイル
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const wiki = defineCollection({
    loader: glob({ base: './src/content/wiki', pattern: '**/*.{md,mdx}' }),
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        aliases: z.array(z.string()).default([]),
        tags: z.array(z.string()).default([]),
        order: z.number().default(0),
        date: z.coerce.date().optional(),
        updated: z.coerce.date().optional(),
        draft: z.boolean().default(false),
        hidden: z.boolean().default(false),
        showBacklinks: z.boolean().default(true),
    }),
});

export const collections = { wiki };
