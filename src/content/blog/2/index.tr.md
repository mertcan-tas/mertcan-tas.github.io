---
title: 'Django’da Ortam Değişkenlerini Yönetmek için python-decouple Kullanımı'
seoTitle: 'python-decouple ile Django Ortam Değişkenlerini Yönetme Rehberi'
slug: 'django-ortam-degiskenleri-python-decouple'
description: 'python-decouple kullanarak Django projenizdeki ortam değişkenlerini güvenle yönetmeyi ve sırlarınızı sürüm kontrolünün dışında tutmayı öğrenin.'
pubDate: '2025-07-11'
updatedDate: '2025-07-11'
tags: ['Django', 'Environment Variables']
coverImage: '2.jpg'
lang: 'tr'
translationKey: 'env-decouple'
---

## Neden Ortam Değişkenleri Kullanmalı?

Django uygulamaları geliştirirken er ya da geç API anahtarları, veritabanı bilgileri ve debug ayarları gibi hassas verilerle uğraşmak zorunda kalırsınız. **Bu değerleri doğrudan kodun içine yazmak (hardcode etmek) ciddi bir güvenlik açığıdır.** Bu bilgiler yanlışlıkla herkese açık bir repoya düşerse, botlar dakikalar içinde hepsini toplayabilir; sonuç da yetkisiz erişim, veri sızıntısı, hatta maddi zarar olabilir.

Söz gelimi OpenAI gibi bir servisin API anahtarını doğrudan `settings.py` dosyanıza yazdığınızı düşünün. Kodunuzu görebilen herkes o anahtarı kullanabilir ve sizin adınıza kabarık faturalar çıkarabilir.

Bu riskleri en aza indirmek için **yapılandırmayı koddan ayırma** prensibine uyarız; bu, [Twelve-Factor App](https://12factor.net/config) yaklaşımının da temel ilkelerinden biridir. Böylece uygulamanızın ayarları kod tabanının dışında kalır, projeniz hem daha güvenli hem de daha taşınabilir olur.

---

## Ön Koşullar

Başlamadan önce projenizde `python-decouple`’ın kurulu olduğundan emin olun.

Kurulu değilse pip ile kurabilirsiniz:

```bash
pip install python-decouple
```

Ayrıca projenizin kök dizininde, içinde `.env` satırı bulunan bir `.gitignore` dosyası olmalı. Hassas ortam değişkenlerinizin yanlışlıkla sürüm kontrolüne girmemesi için bu şart.

```
# .gitignore

.env
```

---

## Adım Adım Rehber

### 1\. Django Projenizin Kökünde Bir `.env` Dosyası Oluşturun

Bu dosya, ortama özel değişkenlerinizi tutacak. `manage.py` ile aynı dizine koyun.

```dotenv
# .env

DEBUG=True
SECRET_KEY="your-super-secret-key-here"  # Generate a secure secret key (e.g., from fernetrix.com) to keep your app safe.
ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_URL=sqlite:///db.sqlite3
```

> **Önemli:** `.env`’in repoya gönderilmemesi için `.gitignore` dosyanızda yer aldığından her zaman emin olun.
>
> `SECRET_KEY` için güçlü ve benzersiz bir anahtar üretin. Bunun için çevrimiçi araçları ya da Django’nun `get_random_secret_key()` fonksiyonunu kullanabilirsiniz.

### 2\. `settings.py` Dosyanızı Güncelleyin

Şimdi bu değerleri `decouple.config()` ile okuyacak şekilde `settings.py` dosyanızı düzenleyin. Böylece koda gömülü değerlerin yerini, ortam değişkenlerinden gelen dinamik değerler alır.

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

> **`config()` parametreleri ne işe yarıyor?**
>
> - `config('KEY_NAME')`: `.env` dosyasından ya da ortam değişkenlerinden `KEY_NAME`’e karşılık gelen değeri okur.
> - `default=False`: Değişken bulunamazsa kullanılacak yedek bir varsayılan değer belirler.
> - `cast=bool`: Ortamdan string olarak gelen değeri ("True", "False" gibi) Python boolean’ına çevirir. `python-decouple`, virgülle ayrılmış bir metni listeye bölen `Csv()` gibi farklı `cast` seçenekleri de sunar.
>
> Yorum satırındaki örnekte görüldüğü gibi, daha karmaşık veritabanı yapılandırmaları için `dj-database-url`’ü `python-decouple` ile birlikte de kullanabilirsiniz.

---

### 3\. Django Uygulamanızı Çalıştırın

`settings.py` güncellendiğine ve `.env` de yerli yerinde olduğuna göre artık geliştirme sunucunuzu başlatabilirsiniz:

```bash
python manage.py runserver
```

Her şey yolundaysa Django uygulamanız ayarları doğrudan `.env` dosyanızdan okuyarak açılır; böylece güvenli ve esnek bir yapılandırma yönetimini de iş başında görmüş olursunuz.

---

## Özet

`python-decouple`’ı Django projelerinize kattığınızda şunları elde edersiniz:

- **Daha fazla güvenlik:** Hassas bilgileriniz sürüm kontrolünün dışında kalır.
- **Taşınabilirlik:** Yapılandırmanızı, kodu hiç değiştirmeden farklı ortamlara (geliştirme, test, üretim) kolayca uyarlayabilirsiniz.
- **Esneklik:** Ayarları ortama göre rahatça değiştirebilir, böylece projenizin bakımını kolaylaştırırsınız.

Bu basit ama bir o kadar etkili kurulum, Django uygulamanızı çok daha sağlam, güvenli ve üretime hazır hâle getirir.
