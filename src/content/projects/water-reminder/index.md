---
name: 'Water Reminder'
description: 'A cross-platform desktop app that reminds you to drink water on a schedule — hydration goals, customizable notifications and autostart.'
tags: ['Vue', 'Tauri', 'Desktop']
repoLink: 'https://github.com/mertcan-tas/water-reminder'
order: 4
lang: 'en'
translationKey: 'water-reminder'
---

## Overview

Water Reminder is a small, cross-platform desktop app that helps you build a steady hydration habit. It sends timely reminders to drink water, tracks your daily intake against a goal, and stays out of your way the rest of the time. Lightweight by design, it starts with your system and runs quietly in the background.

## Features

- **Smart reminders** on a configurable schedule.
- **Daily goals** with progress tracking that resets each day.
- **Silent hours** — set wake/sleep times so you're not nudged at night.
- **Autostart** with the operating system.
- **Multi-language** interface.
- **Local-first** — your data stays on your device.

## Stack

- **Tauri** (Rust) for a native, low-footprint cross-platform shell.
- **Vue 3 + Vuetify** for the UI, **Pinia** for state, **vue-i18n** for translations.
- Native OS integration via Tauri plugins (notifications, autostart, global shortcuts, store).

## Source

Open source (GPL-3.0). The code is on [GitHub](https://github.com/mertcan-tas/water-reminder).
