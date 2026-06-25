import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders'; // Not available with legacy API

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: ({ image }) => z.object({
		title: z.string(),
    seoTitle: z.string().optional(),
		description: z.string(),
		// Transform string to Date object
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
		coverImage: image().optional(),
		lang: z.enum(['en', 'tr']).default('en'),
		translationKey: z.string().optional()
	})
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: ({ image }) => z.object({
		name: z.string(),
		description: z.string(),
		tags: z.array(z.string()).optional(),
		demoLink: z.string().optional(),
		demoLinkRel: z.string().optional(),
		repoLink: z.string().optional(),
		coverImage: image().optional(),
		order: z.number().default(0),
		hasDetail: z.boolean().default(true),
		lang: z.enum(['en', 'tr']).default('en'),
		translationKey: z.string()
	})
});

export const collections = { blog, projects };