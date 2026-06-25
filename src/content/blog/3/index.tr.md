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

Modern web uygulamalarında bazı işlemler zaman alıcı olabilir; örneğin büyük dosyaları işlemek, uzun bir alıcı listesine e-posta göndermek veya karmaşık veri analizleri yapmak gibi. Bu görevleri geleneksel HTTP istek-yanıt döngüsü içinde senkron olarak çalıştırmak kötü bir kullanıcı deneyimine yol açabilir; çünkü kullanıcı arayüzünü bloke eder ve hatta zaman aşımlarına neden olabilir. İşte tam burada arka plan işi işleme devreye girer.

Yüksek seviyeli bir Python web framework'ü olan Django, bu uzun süren işlemleri devretmek için görev kuyruklarından (task queue) yararlanabilir. Python'da arka plan görev yönetimi için popüler seçenekler arasında Redis Queue (RQ), basitliği ve mesaj aracısı olarak Redis'e dayanmasıyla öne çıkar.

Bu makale, arka plan görevlerini verimli bir şekilde yönetmek için Redis RQ'yu Django projenize entegre etme sürecinde size rehberlik edecektir.

---

## Neden Redis RQ?

RQ, işleri kuyruğa almak ve arka planda işlemek için hafif ve anlaşılır bir Python kütüphanesidir. Avantajları şunlardır:

- **Basitlik:** RQ minimalist bir API'ye sahiptir; öğrenmesi ve uygulaması kolaydır.
- **Redis tabanlı:** Veri deposu olarak Redis kullanır ve hızlı, güvenilir bir kuyruklama sağlar.
- **Pythonic:** Standart Python fonksiyonlarından yararlanır; bu da Python geliştiricilerine doğal gelir.
- **İzleme:** RQ, kuyrukları ve iş durumlarını izlemek için web tabanlı bir kontrol paneli (RQ Dashboard) içerir.

---

## Django Projenizi Redis RQ ile Kurma

Başlamak için temel bir Django projesine ve çalışan bir Redis sunucusuna ihtiyacınız olacak.

### **1. Gerekli Paketleri Kurun:**

Önce `django-rq` (RQ'nun Django entegrasyonu) ve `redis`'i kurun:

```bash
pip install django-rq redis
```

### **2. `settings.py` İçinde Redis ve Django-RQ Yapılandırması:**

`django_rq`'yu `INSTALLED_APPS`'inize ekleyin:

```python
INSTALLED_APPS = [
    # ...
    'django_rq',
    # ...
]
```

Ardından Redis bağlantınızı ve RQ kuyruklarınızı yapılandırın. Redis kullanıyorsa mevcut Django cache yapılandırmanızı kullanabilir ya da özellikle RQ için yeni bağlantılar tanımlayabilirsiniz.

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

Bu örnekte üç kuyruk tanımladık: `default`, `high` ve `low`. `default` kuyruğu, Django cache'inden gelen Redis bağlantısını yeniden kullanır. `high` ve `low` ise kendi açık Redis bağlantı bilgileriyle tanımlanmıştır. İhtiyaç duyduğunuz kadar kuyruk oluşturabilir ve her birini belirli bir amaca hizmet edecek şekilde kullanabilirsiniz (ör. `email_queue`, `image_processing_queue`).

### **3. Arka Plan Görevlerinizi Tanımlayın:**

Arka plan görevleri yalnızca sıradan Python fonksiyonlarıdır. Daha iyi bir düzen için, bu fonksiyonları barındıracak ayrı bir dosya (ör. Django uygulamalarınızdan birinde `tasks.py`) oluşturmanız önerilir.

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

`django_rq`'dan gelen `@job` dekoratörü, fonksiyonunuzu bir RQ işi olarak kaydeder. 'default' dışında bir kuyruk kullanmak istiyorsanız kuyruk adını da belirtebilirsiniz.

### **4. Django View'larınızdan İşleri Kuyruğa Alma:**

Artık bu fonksiyonları Django view'larınızdan veya uygulamanızın diğer bölümlerinden çağırabilirsiniz; bunlar arka planda işlenmek üzere kuyruğa alınacaktır.

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

`.delay()` metodu, bir işi kuyruğa almanın kullanışlı bir yoludur. `django_rq` ayrıca açık kuyruğa alma için `django_rq.enqueue(func, *args, **kwargs)` da sunar.

### **5. RQ Worker'larını Çalıştırma:**

İşleri kuyruğa almak yalnızca onları Redis kuyruğuna yerleştirir. Bunları gerçekten işlemek için RQ worker'larını çalıştırmanız gerekir. Bunlar, Redis kuyruklarını sürekli dinleyen ve işleri yürüten ayrı süreçlerdir.

Terminalinizi açın ve Django projenizin kök dizinine gidin. Ardından şunu çalıştırın:

```bash
python manage.py rqworker default high low
```

Bu komut, `default`, `high` ve `low` kuyruklarını dinleyen worker'ları başlatır. Tanımladığınız kuyrukların herhangi bir kombinasyonunu belirtebilirsiniz. Üretim ortamlarında, RQ worker'larınızın her zaman çalıştığından ve çökerlerse otomatik olarak yeniden başlatıldığından emin olmak için Supervisor veya systemd gibi bir süreç yöneticisi kullanmanız şiddetle önerilir.

### **6. RQ Dashboard ile İzleme (İsteğe Bağlı ama Önerilir):**

RQ Dashboard; kuyruklarınızı izlemek, iş durumlarını görüntülemek ve iş sonuçlarını incelemek için basit bir web arayüzü sağlar.

`rq-dashboard`'ı kurun:

```bash
pip install rq-dashboard
```

`settings.py` içindeki `INSTALLED_APPS`'inize `rq_dashboard` ekleyin:

```python
INSTALLED_APPS = [
    # ...
    'django_rq',
    'rq_dashboard', # Add this line
    # ...
]
```

RQ Dashboard'ın URL'lerini projenizin `urls.py` dosyasına dahil edin:

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

RQ Dashboard'a `http://127.0.0.1:8000/rq/` adresine (veya Django projenizin temel URL'sinin ardından `/rq/` ekleyerek) giderek erişebilirsiniz.

## İleri Düzey Kullanım ve Dikkat Edilecekler

- **İş Durumu ve Sonuçları:** RQ'daki işlerin `queued`, `started`, `finished` ve `failed` gibi durumları vardır. Bir kuyruk nesnesindeki `fetch_job()` metodunu kullanarak bir işin durumunu ve (başarıyla tamamlandıysa) sonucunu alabilirsiniz.
- **Hata Yönetimi:** RQ, başarısız işleri otomatik olarak bir "failed" kuyruğuna koyar; bunu kontrol panelinden inceleyebilirsiniz. Ayrıca görev fonksiyonlarınız içinde özel hata yönetimi de uygulayabilirsiniz.
- **İşleri Zamanlama:** İşleri belirli zamanlarda veya aralıklarla çalıştırmak üzere zamanlamak için `django-rq-scheduler` veya benzeri kütüphanelerle entegre olabilirsiniz.
- **Üretimde Worker Yönetimi:** Belirtildiği gibi, üretim ortamlarında sağlam worker yönetimi için Supervisor veya systemd gibi süreç yöneticileri kullanın. Bu, worker'larınızın her zaman çalışmasını ve etkin şekilde yönetilmesini sağlar.
- **Eşzamanlılık (Concurrency):** Daha fazla işi aynı anda işlemek için yalnızca daha fazla RQ worker süreci çalıştırın. Her worker, dinlemek üzere yapılandırıldığı her kuyruk için aynı anda bir iş işleyebilir.
- **Zaman Aşımları:** İşlerin süresiz çalışmasını önlemek için `RQ_QUEUES` ayarlarınızda `DEFAULT_TIMEOUT`'u yapılandırın.

---

## Sonuç

Redis RQ'yu Django uygulamanıza entegre etmek, arka plan görevlerini yönetmenin güçlü ve anlaşılır bir yolunu sunar. Zaman alıcı işlemleri ayrı bir worker sürecine devrederek web uygulamanızın yanıt verme hızını ve ölçeklenebilirliğini önemli ölçüde artırabilir, böylece çok daha iyi bir kullanıcı deneyimi sağlayabilirsiniz. Kullanım kolaylığı ve sağlam Redis altyapısıyla RQ, Django projelerinizde asenkron görevleri yönetmek için mükemmel bir seçimdir.
