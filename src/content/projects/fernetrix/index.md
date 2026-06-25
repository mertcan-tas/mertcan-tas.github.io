---
name: 'Fernetrix'
description: 'A developer tool for generating secure Django secret keys'
tags: ['Tool', 'Django']
demoLink: 'https://www.fernetrix.com'
demoLinkRel: 'nofollow noopener noreferrer'
order: 2
lang: 'en'
translationKey: 'fernetrix'
---

## Overview

Fernetrix is a small web tool that generates cryptographically secure keys for developers — Fernet keys and Django `SECRET_KEY` values — right in the browser, with a single click.

## The problem

Developers need a fresh secret key more often than you'd think: a new Django project, a rotated credential, an encryption key for Fernet. The usual options aren't great — either a Python one-liner you have to look up every time, or a random key-generator site you don't fully trust.

## What it does

Fernetrix is a clean, focused page that generates a strong key on demand and lets you copy it instantly. No accounts, no clutter, no tracking — just the key you need, when you need it.

## Stack

A small Vue app, deliberately kept simple. It's live at [fernetrix.com](https://www.fernetrix.com).
