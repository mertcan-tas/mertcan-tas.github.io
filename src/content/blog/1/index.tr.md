---
title: 'Django REST Framework ile Swagger Dokümantasyonu Oluşturma'
seoTitle: 'Django REST Framework’te OpenAPI (Swagger) Dokümanı Üretme Rehberi'
slug: 'django-rest-framework-swagger-dokumantasyonu'
description: 'drf-spectacular kütüphanesiyle Django REST Framework API’leriniz için OpenAPI 3 (Swagger) dokümantasyonunu nasıl kolayca üretip özelleştireceğinizi öğrenin.'
pubDate: '2025-07-07'
updatedDate: '2025-07-07'
tags: ['Django', 'DRF', 'Swagger']
coverImage: '1.jpg'
lang: 'tr'
translationKey: 'swagger-drf'
---

Otomatik API dokümantasyonu, sağlam bir arka uç servisi geliştirmenin ve sürdürmenin kritik bir parçasıdır. Zaman kazandırır, hataları azaltır ve API’nizi ön uç geliştiriciler, mobil geliştiriciler ve diğer kullanıcılar için çok daha kolay kullanılır hale getirir. Swagger (artık OpenAPI Specification olarak biliniyor) bu konuda sektör standardıdır.

Bu rehber, OpenAPI 3 şemaları üreten modern bir kütüphane olan `drf-spectacular` kullanarak Django REST Framework (DRF) projeniz için şık ve etkileşimli Swagger UI dokümantasyonu kurmanın adımlarını anlatır.

## Neden `drf-spectacular`?

`drf-yasg` gibi başka kütüphaneler de bulunsa da, modern OpenAPI 3 özelliklerini daha iyi desteklemesi, geniş özelleştirme seçenekleri ve aktif olarak bakımının yapılması nedeniyle şu anda `drf-spectacular` önerilmektedir.

## Adım 1: Kurulum

Öncelikle paketi projenize eklemeniz gerekiyor. Terminalinizi açın ve pip ile kurun:

```bash
pip install drf-spectacular
```

---

## Adım 2: `settings.py` Yapılandırması

Ardından `drf-spectacular`'ı Django projenizin ayarlarına kaydetmeniz gerekiyor.

`'drf_spectacular'`'ı `INSTALLED_APPS` listenize ekleyin:

```python
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    'drf_spectacular',
]

PROJECT_APPS = [
    'core',
]

INSTALLED_APPS += PROJECT_APPS + THIRD_PARTY_APPS
```

Sonra, `REST_FRAMEWORK` ayarlarınıza `DEFAULT_SCHEMA_CLASS` ekleyerek Django REST Framework'e varsayılan şema oluşturucu olarak `drf-spectacular`'ı kullanmasını söyleyin:

```python
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}
```

API'nizin başlığı, açıklaması ve sürümü gibi proje genelinde geçerli dokümantasyon ayarlarını da ekleyebilirsiniz.

```python
SPECTACULAR_SETTINGS = {
    'TITLE': 'My Project API',
    'DESCRIPTION': 'A detailed documentation of all the available API endpoints for My Project.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
```

---

## Adım 3: `urls.py` Yapılandırması

Dokümantasyona bir web tarayıcısı üzerinden erişilebilmesi için, UI uç noktalarını projenizin kök `urls.py` dosyasına eklemeniz gerekir. `drf-spectacular` kutudan çıkar çıkmaz iki güzel UI seçeneği sunar: Swagger UI ve ReDoc.

```python
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    # Optional UI:
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
```

Şimdi geliştirme sunucunuzu çalıştırın:

```bash
python manage.py runserver
```

Artık dokümantasyonunuza şu adreslerden erişebilirsiniz:

- **Swagger UI:** `http://127.0.0.1:8000/api/schema/swagger-ui/`
- **ReDoc:** `http://127.0.0.1:8000/api/schema/redoc/`

---

## Adım 4: Dokümantasyonunuzu Özelleştirme

`drf-spectacular`, view'larınızdan, serializer'larınızdan ve modellerinizden bilgi çıkarmada oldukça başarılıdır. Ancak daha özel bir dokümantasyon için `@extend_schema` dekoratörünü kullanabilirsiniz.

Aşağıda, bir viewset'in `list` metoduna özet, açıklama ve özel yanıt örnekleri eklemenin bir örneği yer alıyor.

```python
from rest_framework import viewsets
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from .models import Product
from .serializers import ProductSerializer

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    @extend_schema(
        summary="Retrieve a list of all products",
        description="Provides a paginated list of all products available in the system.",
        responses={
            200: OpenApiResponse(response=ProductSerializer(many=True), description="A list of products."),
            404: OpenApiResponse(description="Not found."),
        }
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
```

Bu dekoratör, `GET /products/` uç noktası için üretilen dokümantasyonu zenginleştirir ve API'nizi kullanan herkes için çok daha anlaşılır hale getirir.

---

## Sonuç

OpenAPI (Swagger) dokümantasyonunu Django REST Framework projenize başarıyla entegre ettiniz. Bu otomatik ve etkileşimli dokümantasyon, geliştirme iş akışınızı önemli ölçüde iyileştirecek ve API'nizi kullanması keyifli hale getirecektir. `drf-spectacular`'dan yararlanarak dokümantasyonunuzun minimum çabayla güncel kalmasını sağlarsınız.
