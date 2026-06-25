---
title: 'Django’da Redis RQ ile Arka Plan İşleri Nasıl Çalıştırılır'
seoTitle: 'Django’da Redis RQ ile Arka Plan İşleri Çalıştırma'
slug: 'django-redis-rq-ile-arka-plan-isleri'
description: 'Redis RQ ile Django’da arka plan işlerini sorunsuzca çalıştırın. Performansı artırın ve uzun süren görevleri verimli yönetin.'
pubDate: '2025-07-12'
updatedDate: '2025-07-12'
tags: ['Django', 'Redis RQ', 'Redis']
coverImage: '3.jpg'
lang: 'tr'
translationKey: 'redis-rq'
---

Modern web uygulamalarında bazı işlemler epeyce zaman alabilir: büyük dosyaları işlemek, uzun bir listeye e-posta göndermek ya da karmaşık veri analizleri yapmak gibi. Bu işleri klasik HTTP istek-yanıt döngüsünün içinde senkron çalıştırmak kötü bir kullanıcı deneyimine yol açar; çünkü arayüzü kilitler, hatta zaman aşımına (timeout) bile neden olabilir. İşte arka plan işleri tam da burada devreye girer.

Yüksek seviyeli bir Python web framework’ü olan Django, bu uzun süren işlemleri görev kuyruklarına (task queue) devredebilir. Python tarafında arka plan görevlerini yönetmek için kullanılan popüler araçlar arasında Redis Queue (RQ); sadeliği ve mesaj aracısı olarak Redis’i kullanmasıyla öne çıkar.

Bu yazıda, arka plan görevlerini verimli bir şekilde yönetebilmek için Redis RQ’yu Django projenize nasıl entegre edeceğinizi adım adım anlatacağım.

---

## Neden Redis RQ?

RQ, işleri kuyruğa alıp arka planda çalıştırmak için kullanılan hafif ve sade bir Python kütüphanesidir. Öne çıkan tarafları şöyle:

- **Sadelik:** Minimalist bir API’si var; öğrenmesi ve kullanması kolay.
- **Redis tabanlı:** Veriyi Redis’te tuttuğu için hızlı ve güvenilir bir kuyruk sağlar.
- **Pythonic:** Sıradan Python fonksiyonlarıyla çalışır, bu yüzden Python geliştiricilerine son derece doğal gelir.
- **İzleme:** Kuyrukları ve iş durumlarını takip edebileceğiniz web tabanlı bir paneli (RQ Dashboard) var.

---

## Django Projenizi Redis RQ ile Kurma

Başlamak için elinizde temel bir Django projesi ve çalışan bir Redis sunucusu olması yeterli.

### **1. Gerekli Paketleri Kurun:**

Önce `django-rq` (RQ’nun Django entegrasyonu) ve `redis` paketlerini kurun:

```bash
pip install django-rq redis
```

### **2. `settings.py` İçinde Redis ve Django-RQ Yapılandırması:**

`django_rq`’yu `INSTALLED_APPS`’e ekleyin:

```python
INSTALLED_APPS = [
    # ...
    'django_rq',
    # ...
]
```

Ardından Redis bağlantınızı ve RQ kuyruklarınızı tanımlayın. Redis kullanan bir Django cache yapılandırmanız varsa onu kullanabilir, ya da yalnızca RQ için yeni bağlantılar tanımlayabilirsiniz.

```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1', # Use your Redis URL
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

RQ_QUEUES = {
    'default': {
        'USE_REDIS_CACHE': 'default', # Use the 'default' cache defined above
    },
    'high': {
        'HOST': 'localhost',
        'PORT': 6379,
        'DB': 0,
        'PASSWORD': 'your_redis_password', # Optional, if Redis requires authentication
        'DEFAULT_TIMEOUT': 360,
    },
    'low': {
        'HOST': 'localhost',
        'PORT': 6379,
        'DB': 0,
        'DEFAULT_TIMEOUT': 300,
    }
}
```

Bu örnekte üç kuyruk tanımladık: `default`, `high` ve `low`. `default` kuyruğu, Django cache’indeki Redis bağlantısını yeniden kullanıyor; `high` ve `low` ise kendi Redis bağlantı bilgileriyle ayrı ayrı tanımlı. İhtiyacınıza göre istediğiniz kadar kuyruk açabilirsiniz; her biri ayrı bir amaca hizmet edebilir (örneğin `email_queue`, `image_processing_queue`).

### **3. Arka Plan Görevlerinizi Tanımlayın:**

Arka plan görevleri aslında sıradan Python fonksiyonlarından ibaret. Düzeni korumak için bu fonksiyonları ayrı bir dosyada toplamanız iyi olur (örneğin uygulamalarınızdan birinde bir `tasks.py`).

```python
# myapp/tasks.py

import time
from django_rq import job

@job
def long_running_task(param1, param2):
    print(f"Starting long running task with {param1} and {param2}...")
    time.sleep(10) # Simulate a long-running operation
    print("Long running task finished!")
    return f"Task completed for {param1}"

@job('high') # Enqueue this task to the 'high' priority queue
def send_email_task(recipient_email, subject, message):
    print(f"Sending email to {recipient_email}...")
    time.sleep(5) # Simulate email sending
    print(f"Email sent to {recipient_email}")
    return True
```

`django_rq`’dan gelen `@job` dekoratörü, fonksiyonunuzu bir RQ işi olarak kaydeder. ‘default’ dışında bir kuyruk kullanmak isterseniz kuyruğun adını da belirtebilirsiniz.

### **4. Django View’larınızdan İşleri Kuyruğa Alma:**

Artık bu fonksiyonları Django view’larınızdan ya da uygulamanızın başka yerlerinden çağırabilirsiniz; çağırdığınız anda arka planda işlenmek üzere kuyruğa alınırlar.

```python
# myapp/views.py

from django.http import HttpResponse
from .tasks import long_running_task, send_email_task
import django_rq

def trigger_background_task(request):
    # Enqueue to the default queue
    job = long_running_task.delay("value1", "value2")
    return HttpResponse(f"Background task enqueued with job ID: {job.id}")

def trigger_email_task(request):
    # Enqueue to the 'high' priority queue
    job = send_email_task.delay("user@example.com", "Welcome!", "Thanks for signing up!")
    return HttpResponse(f"Email task enqueued with job ID: {job.id}")

def get_job_status(request, job_id):
    queue = django_rq.get_queue('default') # Or the specific queue where the job was enqueued
    job = queue.fetch_job(job_id)
    if job:
        return HttpResponse(f"Job {job_id} status: {job.get_status()}, result: {job.result}")
    return HttpResponse(f"Job {job_id} not found.")
```

`.delay()` metodu, bir işi kuyruğa almanın en pratik yolu. `django_rq` ayrıca işi açıkça kuyruğa almak için `django_rq.enqueue(func, *args, **kwargs)` fonksiyonunu da sunar.

### **5. RQ Worker’larını Çalıştırma:**

İşleri kuyruğa almak, onları yalnızca Redis kuyruğuna koyar. Gerçekten işlenmeleri için RQ worker’larını çalıştırmanız gerekir. Worker’lar, Redis kuyruklarını sürekli dinleyip işleri çalıştıran ayrı süreçlerdir.

Terminali açıp Django projenizin kök dizinine geçin ve şunu çalıştırın:

```bash
python manage.py rqworker default high low
```

Bu komut; `default`, `high` ve `low` kuyruklarını dinleyen worker’ları başlatır. Tanımladığınız kuyruklardan istediğiniz kombinasyonu verebilirsiniz. Üretim ortamında, worker’larınızın her zaman ayakta kalması ve çökerlerse otomatik yeniden başlaması için Supervisor ya da systemd gibi bir süreç yöneticisi kullanmanızı kesinlikle öneririm.

### **6. RQ Dashboard ile İzleme (İsteğe Bağlı ama Tavsiye Edilir):**

RQ Dashboard; kuyruklarınızı izlemek, iş durumlarını görmek ve sonuçları incelemek için basit bir web arayüzü sunar.

`rq-dashboard`’ı kurun:

```bash
pip install rq-dashboard
```

`settings.py` içindeki `INSTALLED_APPS`’e `rq_dashboard`’ı ekleyin:

```python
INSTALLED_APPS = [
    # ...
    'django_rq',
    'rq_dashboard', # Add this line
    # ...
]
```

RQ Dashboard’ın URL’lerini projenizin `urls.py` dosyasına dahil edin:

```python
# yourproject/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('rq/', include('rq_dashboard.urls')), # Add this line
    # ... your other app URLs
]
```

Şimdi Django geliştirme sunucunuzu çalıştırın:

```bash
python manage.py runserver
```

RQ Dashboard’a `http://127.0.0.1:8000/rq/` adresinden (ya da projenizin temel adresinin sonuna `/rq/` ekleyerek) ulaşabilirsiniz.

## İleri Düzey Kullanım ve Dikkat Edilecekler

- **İş durumu ve sonuçları:** RQ’daki işlerin `queued`, `started`, `finished` ve `failed` gibi durumları olur. Bir kuyruk nesnesi üzerindeki `fetch_job()` metoduyla bir işin durumunu ve (başarıyla bittiyse) sonucunu alabilirsiniz.
- **Hata yönetimi:** RQ, başarısız olan işleri otomatik olarak bir “failed” kuyruğuna alır; bunları panelden inceleyebilirsiniz. Dilerseniz görev fonksiyonlarınızın içine kendi hata yönetiminizi de ekleyebilirsiniz.
- **İşleri zamanlama:** İşleri belirli saatlerde veya aralıklarla çalıştırmak isterseniz `django-rq-scheduler` gibi kütüphanelerle entegre olabilirsiniz.
- **Üretimde worker yönetimi:** Dediğim gibi, üretim ortamında sağlam bir worker yönetimi için Supervisor ya da systemd gibi süreç yöneticileri kullanın. Böylece worker’larınız hep ayakta kalır ve rahatça yönetilir.
- **Eşzamanlılık:** Aynı anda daha fazla iş çalıştırmak için yalnızca daha fazla RQ worker süreci başlatmanız yeterli. Her worker, dinlediği her kuyruk için aynı anda tek bir iş çalıştırır.
- **Zaman aşımı:** İşlerin sonsuza kadar çalışmasını engellemek için `RQ_QUEUES` ayarlarınızda `DEFAULT_TIMEOUT` değerini belirleyin.

---

## Sonuç

Redis RQ’yu Django uygulamanıza entegre etmek, arka plan görevlerini yönetmenin güçlü ve anlaşılır bir yolunu sunar. Zaman alan işlemleri ayrı bir worker sürecine devrederek web uygulamanızın yanıt verme hızını ve ölçeklenebilirliğini ciddi şekilde artırabilir, böylece kullanıcılarınıza çok daha iyi bir deneyim sunabilirsiniz. Kullanım kolaylığı ve sağlam Redis altyapısıyla RQ, Django projelerinizde asenkron görevleri yönetmek için harika bir seçim.
