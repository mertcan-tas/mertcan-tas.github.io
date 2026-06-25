import { getCollection } from 'astro:content';
import type { Lang } from './utils';

export async function getPostsByLang(lang: Lang) {
  const all = await getCollection('blog');
  return all.filter((p) => (p.data.lang ?? 'en') === lang);
}

export async function getPostByTranslationKey(key: string | undefined, lang: Lang) {
  if (!key) return undefined;
  const all = await getCollection('blog');
  return all.find((p) => p.data.translationKey === key && (p.data.lang ?? 'en') === lang);
}
