import { defaultLang } from './ui';

export type Lang = 'en' | 'tr';

export function getLangFromUrl(url: URL): Lang {
  const [, seg] = url.pathname.split('/');
  if (seg === 'tr') return 'tr';
  return 'en';
}

/** "/tr/posts/" -> "/posts/" ; "/tr" -> "/" ; "/posts/" -> "/posts/" */
export function stripLocale(pathname: string): string {
  const p = pathname.replace(/^\/tr(?=\/|$)/, '');
  return p === '' ? '/' : p;
}

/** logical path + target lang -> concrete path */
export function withLocale(pathname: string, lang: Lang): string {
  const logical = stripLocale(pathname);
  if (lang === defaultLang) return logical;
  return logical === '/' ? '/tr/' : '/tr' + logical;
}
