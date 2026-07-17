// Save this as: src/content.config.ts  (NOT inside src/content/ — Astro 5+ convention)
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.string().default('Digital Business'),
      image: image().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
    }),
});

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/case-studies' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      client: z.string(),
      summary: z.string(),
      challenge: z.string().optional(),
      results: z.array(z.string()).default([]),
      pubDate: z.coerce.date(),
      image: image().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
    }),
});

const legal = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, caseStudies, legal };