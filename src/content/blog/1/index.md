---
title: 'Creating Swagger Documentation in Django Rest Framework'
seoTitle: 'A Guide to Generating OpenAPI (Swagger) Docs in Django REST Framework'
slug: 'creating-swagger-documentation-django-rest-framework'
description: 'Learn how to easily generate and customize OpenAPI 3 (Swagger) documentation for your Django REST Framework APIs using the drf-spectacular library.'
pubDate: '2025-07-07'
updatedDate: '2025-07-07'
tags: ['Django', 'DRF', 'Swagger']
coverImage: '1.jpg'
---

Automated API documentation is a crucial part of developing and maintaining a robust backend service. It saves time, reduces errors, and makes your API much easier for frontend developers, mobile developers, and other consumers to work with. Swagger (now known as the OpenAPI Specification) is the industry standard for this.

This guide will walk you through setting up beautiful, interactive Swagger UI documentation for your Django REST Framework (DRF) project using `drf-spectacular`, a modern library that generates OpenAPI 3 schemas.

## Why `drf-spectacular`?

While other libraries like `drf-yasg` exist, `drf-spectacular` is currently recommended for its better support of modern OpenAPI 3 features, extensive customization options, and active maintenance.

## Step 1: Installation

First, you need to add the package to your project. Open your terminal and install it using pip:

```bash
pip install drf-spectacular
```

---

## Step 2: Configure `settings.py`

Next, you need to register `drf-spectacular` in your Django project's settings.

Add `'drf_spectacular'` to your `INSTALLED_APPS` list:

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

Then, tell Django REST Framework to use `drf-spectacular` as its default schema generator by adding the `DEFAULT_SCHEMA_CLASS` to your `REST_FRAMEWORK` settings:

```python
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}
```

You can also add project-wide documentation settings, such as the title, description, and version of your API.

```python
SPECTACULAR_SETTINGS = {
    'TITLE': 'My Project API',
    'DESCRIPTION': 'A detailed documentation of all the available API endpoints for My Project.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
```

---

## Step 3: Configure `urls.py`

To make the documentation accessible via a web browser, you need to add the UI endpoints to your project's root `urls.py` file. `drf-spectacular` provides two beautiful UI options out of the box: Swagger UI and ReDoc.

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

Now, run your development server:

```bash
python manage.py runserver
```

You can now access your documentation at:

- **Swagger UI:** `http://127.0.0.1:8000/api/schema/swagger-ui/`
- **ReDoc:** `http://127.0.0.1:8000/api/schema/redoc/`

---

## Step 4: Customizing Your Documentation

`drf-spectacular` does a great job of inferring information from your views, serializers, and models. However, for more specific documentation, you can use the `@extend_schema` decorator.

Here is an example of how to add a summary, description, and custom response examples to a viewset's list method.

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

This decorator will enrich the generated documentation for the `GET /products/` endpoint, making it much clearer for anyone using your API.

---

## Conclusion

You have successfully integrated OpenAPI (Swagger) documentation into your Django REST Framework project. This automated, interactive documentation will significantly improve your development workflow and make your API a pleasure to use. By leveraging `drf-spectacular`, you ensure your documentation stays up-to-date with minimal effort.
