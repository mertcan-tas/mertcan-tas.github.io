---
name: 'Water Reminder'
description: 'Belirli aralıklarla su içmeyi hatırlatan çapraz platform masaüstü uygulaması — su hedefleri, özelleştirilebilir bildirimler ve otomatik başlatma.'
tags: ['Vue', 'Tauri', 'Desktop']
repoLink: 'https://github.com/mertcan-tas/water-reminder'
order: 4
lang: 'tr'
translationKey: 'water-reminder'
---

## Genel Bakış

Water Reminder, düzenli su içme alışkanlığı kazanmana yardımcı olan küçük, çapraz platform bir masaüstü uygulaması. Zamanında su içme hatırlatmaları gönderiyor, günlük su tüketimini bir hedefe göre takip ediyor ve geri kalan zamanda ayak altında dolaşmıyor. Tasarımı gereği hafif; sistemle birlikte açılıp arka planda sessizce çalışıyor.

## Özellikler

- **Akıllı hatırlatmalar** — ayarlanabilir bir programa göre.
- **Günlük hedefler** ve her gün sıfırlanan ilerleme takibi.
- **Sessiz saatler** — uyku/uyanma saatlerini ayarlayın, gece rahatsız edilmeyin.
- İşletim sistemiyle **otomatik başlatma**.
- **Çok dilli** arayüz.
- **Yerel öncelikli** — verileriniz cihazınızda kalır.

## Teknoloji

- Native ve düşük kaynak tüketen çapraz platform kabuk için **Tauri** (Rust).
- Arayüz için **Vue 3 + Vuetify**, durum için **Pinia**, çeviriler için **vue-i18n**.
- Tauri eklentileriyle native işletim sistemi entegrasyonu (bildirimler, otomatik başlatma, global kısayollar, store).

## Kaynak

Açık kaynak (GPL-3.0). Kod [GitHub](https://github.com/mertcan-tas/water-reminder)'da.
