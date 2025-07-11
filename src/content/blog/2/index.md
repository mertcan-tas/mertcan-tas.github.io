---
title: 'Using python-decouple to Manage Environment Variables in Django'
seoTitle: 'A Guide to Managing Django Environment Variables with python-decouple'
slug: 'manage-environment-variables-django-decouple'
description: 'Learn how to securely manage environment variables in your Django project using python-decouple, keeping your secrets out of source control.'
pubDate: '2025-07-11'
updatedDate: '2025-07-11'
tags: ['Django', 'Environment Variables']
coverImage: '2.jpg'
---

## Why Use Environment Variables?

When developing Django applications, you'll inevitably deal with sensitive information like API keys, database credentials, and debug settings. **Hardcoding these values directly into your source code is a significant security risk.** If they accidentally end up in a public repository, automated bots can scrape them within minutes, potentially leading to unauthorized access, data breaches, or even financial liabilities.

Consider embedding an API key for a service like OpenAI directly in your `settings.py` file. Anyone with access to your code could use that key, potentially incurring substantial costs in your name.

To mitigate these risks, we adhere to the principle of **separating configuration from code**—a core tenet emphasized in the [Twelve-Factor App methodology](https://12factor.net/config). This approach ensures your application's settings are external to the codebase, making your project more secure and portable.

---

## Prerequisites

Before we dive in, make sure you have `python-decouple` installed in your project.

If you haven't already, install it using pip:

```bash
pip install python-decouple
```

You'll also need a `.gitignore` file in your project's root directory that explicitly includes `.env`. This is crucial to prevent your sensitive environment variables from being committed to version control.

```
# .gitignore

.env
```

---

## Step-by-Step Guide

### 1\. Create a `.env` file at the Root of Your Django Project

This file will store your environment-specific variables. Place it in the same directory as your `manage.py` file.

```dotenv
# .env

DEBUG=True
SECRET_KEY="your-super-secret-key-here"  # Generate a secure secret key (e.g., from fernetrix.com) to keep your app safe.
ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_URL=sqlite:///db.sqlite3
```

> **Important:** Always ensure `.env` is listed in your `.gitignore` file to prevent it from being committed to your repository.
>
> For `SECRET_KEY`, generate a strong, unique key. You can use online tools or Django's `get_random_secret_key()` function for this.

### 2\. Update Your `settings.py`

Now, modify your `settings.py` file to read these values using `decouple.config()`. This replaces any hardcoded values with dynamic lookups from your environment variables.

```python
# your_project/settings.py

from decouple import config, Csv
import os

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())


# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

# Example of reading a database URL (e.g., for PostgreSQL in production)
# from dj_database_url import parse as db_url
# DATABASES = {
#     'default': config('DATABASE_URL', cast=db_url)
# }
```

> **Explanation of `config()` parameters:**
>
> - `config('KEY_NAME')`: Reads the value associated with `KEY_NAME` from `.env` or environment variables.
> - `default=False`: Provides a fallback default value if the environment variable is not found.
> - `cast=bool`: Converts the string value read from the environment (e.g., "True", "False") into a Python boolean. `python-decouple` provides various `cast` options, like `Csv()` which splits a comma-separated string into a list.
>
> You can also integrate `dj-database-url` with `python-decouple` for more complex database configurations, as shown in the commented example.

---

### 3\. Run Your Django Application

With your `settings.py` updated and `.env` in place, you can now launch your development server:

```bash
python manage.py runserver
```

If everything is configured correctly, your Django application will boot up using the settings loaded from your `.env` file, demonstrating secure and flexible configuration management.

---

## Summary

By integrating `python-decouple` into your Django projects, you achieve:

- **Enhanced Security:** Your sensitive credentials are kept out of source control.
- **Portability:** Your configuration can be easily adapted across different deployment environments (development, staging, production) without modifying your codebase.
- **Flexibility:** It allows for easy switching of settings based on the environment, improving your project's maintainability.

This simple yet effective setup significantly contributes to making your Django application more robust, secure, and production-ready.
