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

Django uygulamaları geliştirirken kaçınılmaz olarak API anahtarları, veritabanı kimlik bilgileri ve debug ayarları gibi hassas bilgilerle uğraşırsınız. **Bu değerleri doğrudan kaynak kodunuza gömmek (hardcode etmek) ciddi bir güvenlik riskidir.** Eğer yanlışlıkla herkese açık bir depoya düşerlerse, otomatik botlar bunları dakikalar içinde toplayabilir; bu da yetkisiz erişime, veri ihlallerine ve hatta finansal yükümlülüklere yol açabilir.

OpenAI gibi bir servise ait bir API anahtarını doğrudan `settings.py` dosyanıza gömdüğünüzü düşünün. Kodunuza erişimi olan herkes bu anahtarı kullanabilir ve sizin adınıza ciddi maliyetlere neden olabilir.

Bu riskleri azaltmak için **yapılandırmayı koddan ayırma** ilkesine bağlı kalırız — bu, [Twelve-Factor App metodolojisinde](https://12factor.net/config) vurgulanan temel bir prensiptir. Bu yaklaşım, uygulamanızın ayarlarının kod tabanının dışında olmasını sağlayarak projenizi daha güvenli ve taşınabilir hale getirir.

---

## Ön Koşullar

Başlamadan önce, projenizde `python-decouple`'ın kurulu olduğundan emin olun.

Henüz kurmadıysanız, pip ile kurun:

```bash
pip install python-decouple
```

Ayrıca projenizin kök dizininde, açıkça `.env`'i içeren bir `.gitignore` dosyasına ihtiyacınız olacak. Bu, hassas ortam değişkenlerinizin sürüm kontrolüne işlenmesini (commit edilmesini) önlemek için kritiktir.

```
# .gitignore

.env
```

---

## Adım Adım Rehber

### 1\. Django Projenizin Kökünde Bir `.env` Dosyası Oluşturun

Bu dosya ortama özgü değişkenlerinizi saklayacaktır. `manage.py` dosyanızla aynı dizine yerleştirin.

```dotenv
# .env

DEBUG=True
SECRET_KEY="your-super-secret-key-here"  # Generate a secure secret key (e.g., from fernetrix.com) to keep your app safe.
ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_URL=sqlite:///db.sqlite3
```

> **Önemli:** `.env`'in deponuza işlenmesini önlemek için her zaman `.gitignore` dosyanızda listelendiğinden emin olun.
>
> `SECRET_KEY` için güçlü ve benzersiz bir anahtar üretin. Bunun için çevrimiçi araçları veya Django'nun `get_random_secret_key()` fonksiyonunu kullanabilirsiniz.

### 2\. `settings.py` Dosyanızı Güncelleyin

Şimdi, bu değerleri `decouple.config()` kullanarak okumak için `settings.py` dosyanızı değiştirin. Bu, gömülü (hardcoded) değerlerin yerine ortam değişkenlerinizden dinamik aramalar koyar.

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

> **`config()` parametrelerinin açıklaması:**
>
> - `config('KEY_NAME')`: `.env` veya ortam değişkenlerinden `KEY_NAME` ile ilişkili değeri okur.
> - `default=False`: Ortam değişkeni bulunamazsa kullanılacak yedek bir varsayılan değer sağlar.
> - `cast=bool`: Ortamdan okunan string değeri (ör. "True", "False") bir Python boolean'ına dönüştürür. `python-decouple`, virgülle ayrılmış bir string'i listeye bölen `Csv()` gibi çeşitli `cast` seçenekleri sunar.
>
> Yorum satırındaki örnekte gösterildiği gibi, daha karmaşık veritabanı yapılandırmaları için `dj-database-url`'ü `python-decouple` ile birlikte de kullanabilirsiniz.

---

### 3\. Django Uygulamanızı Çalıştırın

`settings.py` dosyanız güncellendiğine ve `.env` yerinde olduğuna göre, artık geliştirme sunucunuzu başlatabilirsiniz:

```bash
python manage.py runserver
```

Her şey doğru yapılandırıldıysa, Django uygulamanız `.env` dosyanızdan yüklenen ayarlarla açılır ve güvenli, esnek bir yapılandırma yönetimi sergiler.

---

## Özet

`python-decouple`'ı Django projelerinize entegre ederek şunları elde edersiniz:

- **Artırılmış Güvenlik:** Hassas kimlik bilgileriniz sürüm kontrolünün dışında tutulur.
- **Taşınabilirlik:** Yapılandırmanız, kod tabanınızı değiştirmeden farklı dağıtım ortamlarına (geliştirme, hazırlık, üretim) kolayca uyarlanabilir.
- **Esneklik:** Ortama göre ayarların kolayca değiştirilmesine olanak tanıyarak projenizin sürdürülebilirliğini artırır.

Bu basit ama etkili kurulum, Django uygulamanızı daha sağlam, güvenli ve üretime hazır hale getirmeye önemli ölçüde katkıda bulunur.
