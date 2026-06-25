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

Otomatik API dokümantasyonu, sağlam bir backend servisi geliştirmenin ve sürdürmenin en önemli parçalarından biridir. Hem zaman kazandırır, hem hata payını düşürür, hem de API’nizi frontend geliştiriciler, mobil geliştiriciler ve API’nizle çalışan herkes için çok daha anlaşılır kılar. Bu işin standardı ise Swagger; yani bugünkü adıyla OpenAPI Specification.

Bu rehberde, OpenAPI 3 şemaları üreten modern bir kütüphane olan `drf-spectacular` ile Django REST Framework (DRF) projeniz için şık ve etkileşimli bir Swagger UI dokümantasyonunu adım adım kuracağız.

## Neden `drf-spectacular`?

`drf-yasg` gibi başka kütüphaneler de var; ama modern OpenAPI 3 özelliklerini daha iyi desteklediği, geniş özelleştirme imkânı sunduğu ve aktif olarak geliştirildiği için bugün önerilen kütüphane `drf-spectacular`.

## Adım 1: Kurulum

Önce paketi projenize eklemeniz gerekiyor. Terminali açıp pip ile kurun:

```bash
pip install drf-spectacular
```

---

## Adım 2: `settings.py` Yapılandırması

Sırada `drf-spectacular`’ı Django projenizin ayarlarına tanıtmak var.

`'drf_spectacular'`’ı `INSTALLED_APPS` listesine ekleyin:

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

Ardından `REST_FRAMEWORK` ayarlarına `DEFAULT_SCHEMA_CLASS` ekleyerek DRF’e varsayılan şema oluşturucu olarak `drf-spectacular`’ı kullanmasını söyleyin:

```python
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}
```

API’nizin başlığı, açıklaması, sürümü gibi proje geneli dokümantasyon ayarlarını da buradan tanımlayabilirsiniz.

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

Dokümantasyona tarayıcıdan erişebilmek için arayüz (UI) adreslerini projenizin kök `urls.py` dosyasına eklemeniz gerekiyor. `drf-spectacular`, hazır olarak iki güzel arayüz seçeneğiyle geliyor: Swagger UI ve ReDoc.

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

Şimdi geliştirme sunucusunu çalıştırın:

```bash
python manage.py runserver
```

Artık dokümantasyonunuza şu adreslerden ulaşabilirsiniz:

- **Swagger UI:** `http://127.0.0.1:8000/api/schema/swagger-ui/`
- **ReDoc:** `http://127.0.0.1:8000/api/schema/redoc/`

---

## Adım 4: Dokümantasyonu Özelleştirme

`drf-spectacular`, view’larınızdan, serializer’larınızdan ve modellerinizden bilgi çıkarmakta gerçekten başarılı. Yine de daha ayrıntılı bir dokümantasyon istiyorsanız `@extend_schema` dekoratörünü kullanabilirsiniz.

Aşağıda, bir viewset’in `list` metoduna nasıl özet, açıklama ve özel yanıt örnekleri ekleyebileceğinizi gösteren bir örnek var.

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

Bu dekoratör, `GET /products/` endpoint’i için üretilen dokümantasyonu zenginleştirir ve API’nizi kullanan herkes için çok daha anlaşılır hâle getirir.

---

## Sonuç

Böylece OpenAPI (Swagger) dokümantasyonunu Django REST Framework projenize başarıyla entegre etmiş oldunuz. Bu otomatik ve etkileşimli dokümantasyon, geliştirme sürecinizi gözle görülür şekilde kolaylaştıracak, API’nizi de kullanması keyifli bir hâle getirecek. En güzeli, `drf-spectacular` sayesinde dokümantasyonunuz neredeyse hiç uğraşmadan güncel kalır.
