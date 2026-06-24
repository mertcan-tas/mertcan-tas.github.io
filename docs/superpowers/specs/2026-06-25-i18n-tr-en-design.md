# Çok Dilli Site (TR / EN) — Tasarım Dokümanı

**Tarih:** 2026-06-25
**Durum:** Onaylandı (tasarım)

## Amaç

Astro portföy/blog sitesine Türkçe + İngilizce çok dilli destek eklemek:
- 3 mevcut makalenin Türkçe çevirilerini eklemek
- Tüm arayüz metinlerini (menü, ana sayfa, başlıklar, footer vb.) iki dilde sunmak
- Header'a `TR / EN` dil değiştirici eklemek

## Kararlar (kullanıcı onaylı)

1. **Çeviri:** 3 makaleyi ben (asistan) Türkçe'ye çeviririm; teknik terimler korunur.
2. **URL yapısı:** EN kökte (`/`), TR `/tr/` önekiyle. `routing.prefixDefaultLocale: false`. Mevcut İngilizce URL'ler değişmez.
3. **Kapsam:** Makaleler + tüm arayüz metinleri.
4. **İçerik depolama:** Aynı klasörde sibling dosya — `blog/<n>/index.md` (EN) + `blog/<n>/index.tr.md` (TR). Görseller paylaşılır.

## Mimari

### 1. i18n yapılandırması — `astro.config.mjs`
```js
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'tr'],
  routing: { prefixDefaultLocale: false }
}
```
- Aktif dil her `.astro` dosyasında `Astro.currentLocale` ile okunur (prop taşıma yok).
- `@astrojs/sitemap` i18n config'i eklenir (hreflang için).

### 2. İçerik koleksiyonu — `src/content.config.ts`
Şemaya eklenecek alanlar:
- `lang: z.enum(['en', 'tr']).default('en')`
- `translationKey: z.string()` — EN/TR sürümlerini eşler.

Glob loader `**/*.md` desenini koruduğu için `index.tr.md` dosyaları otomatik toplanır. `slug` frontmatter alanı entry `id`'sini (dolayısıyla rotayı) belirlemeye devam eder.

Her makale klasörüne `index.tr.md`:
- Türkçe `title`, `seoTitle`, `description`, Türkçe `slug`
- `lang: 'tr'`, EN sürümüyle aynı `translationKey`
- Aynı `pubDate`/`updatedDate`, aynı `coverImage` (klasördeki görsel)
- **Tag'ler ortak/İngilizce** (Django, DRF, Redis, Swagger, Environment Variables, Redis RQ) — teknik terim oldukları için iki dilde de aynı.

EN dosyalarına da `translationKey` (ve gerekiyorsa açık `lang: 'en'`) eklenir.

translationKey eşleştirmesi:
- `1` (Swagger/DRF) → `swagger-drf`
- `2` (python-decouple) → `env-decouple`
- `3` (Redis RQ) → `redis-rq`

### 3. i18n yardımcı modülü — `src/i18n/`
- `ui.ts`: `defaultLang`, `languages = { en, tr }`, `ui` sözlüğü (anahtar→metin, dil bazlı), `useTranslations(lang)` → `t(key)`.
- `utils.ts`: `getLocaleFromUrl(url)`, `localizedPath(path, lang)` (yola `/tr` ekler/çıkarır), `getOppositePath(pathname, lang)`.
- `content.ts`: `getPostsByLang(lang)`, `getTagsByLang(lang)`, `getPostByTranslationKey(key, lang)` — `getCollection('blog')` üzerinde `data.lang` filtresi.

### 4. Sayfa yapısı
EN sayfalar kökte kalır ama artık `lang === 'en'` filtreler. `src/pages/tr/` altında ayna:
```
src/pages/index.astro              src/pages/tr/index.astro
src/pages/posts/index.astro        src/pages/tr/posts/index.astro
src/pages/projects/index.astro     src/pages/tr/projects/index.astro
src/pages/tags/index.astro         src/pages/tr/tags/index.astro
src/pages/tags/[tag]/index.astro   src/pages/tr/tags/[tag]/index.astro
src/pages/[...slug].astro          src/pages/tr/[...slug].astro
src/pages/about.astro              src/pages/tr/about.astro
```
- `[...slug].astro` ve `tr/[...slug].astro` `getStaticPaths`'te yalnızca kendi dilinin postlarını üretir.
- Makale gövdesi tekrarını önlemek için `src/components/Article.astro` çıkarılır; her iki slug sayfası onu kullanır.
- 404: tek sayfa kalır, iki dilli (TR + EN) metin gösterir.

### 5. Component'lerde dil farkındalığı (`Astro.currentLocale`)
- `BaseLayout`: `<html lang={Astro.currentLocale}>`; opsiyonel `altLocaleUrl` prop'unu Header'a iletir.
- `Header`: menü etiketleri `t()` ile; menü/logo linkleri aktif dile göre `/tr` önekli; `TR / EN` switcher tema butonunun yanında.
- `FormattedDate`: `Astro.currentLocale === 'tr' ? 'tr-TR' : 'en-US'`.
- `PostItem`, `PostsByYear`: makale linkleri aktif dile göre öneklenir.
- `Footer`, `AboutTheAuthor`: metinler `t()` ile.
- `BaseHead`: `hreflang` alternate linkleri (en ↔ tr) + dile uygun `og:locale`.

### 6. Dil değiştirici davranışı
- Yapısal sayfalar: `getOppositePath(pathname, target)` ile `/tr` öneki eklenir/çıkarılır.
- Makale sayfaları: slug'lar farklı olduğundan, sayfa `translationKey` ile karşı dildeki postu bulup `altLocaleUrl`'i `BaseLayout`'a verir; switcher bu açık URL'i kullanır.

### 7. RSS — `src/pages/rss.xml.js` + `src/pages/tr/rss.xml.js`
- Her feed kendi dilinin postlarını listeler (`data.lang` filtresi).
- Link üretimi `post.id` kullanır (mevcut `post.slug` → `/undefined/` hatası düzeltilir); TR feed linkleri `/tr/` önekli.

### 8. Arayüz sözlüğü kapsamı (`ui.ts` anahtarları)
nav (posts/projects/tags), home (greeting + 2 paragraf intro + "Recent Posts" + "My Projects" + "All posts »"/"All projects »"), posts sayfası (başlık+açıklama), tags sayfası (başlık+açıklama, "All Posts Tagged with"), projects sayfası (başlık+açıklama), footer ("Powered by"), about (başlık + paragraflar), 404 (başlık + metin), "About the Author" widget, Fernetrix proje açıklaması, makale meta ("Published on"/"Updated on", "Article"/"Demo").

## Test / Doğrulama
- `pnpm run build` (CI ile aynı) hatasız geçmeli; `astro check` temiz.
- Üretilen rotalar kontrol: `/`, `/tr/`, `/posts/`, `/tr/posts/`, her makale EN+TR, `/tags/*`, `/tr/tags/*`, `/rss.xml`, `/tr/rss.xml`.
- Deploy sonrası canlı kontrol: dil switcher her sayfa türünde doğru karşılığa gidiyor; tarih biçimi dile göre; hreflang head'de.

## Kapsam dışı (YAGNI)
- Tarayıcı diline göre otomatik yönlendirme (manuel switcher yeterli).
- Tag etiketlerinin Türkçeleştirilmesi (teknik terimler ortak kalır).
- 3.+ diller, çeviri yönetim arayüzü.
