from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from core.views import AdminStatsView, health_check

admin.site.site_header = "Campus Connect Administration"
admin.site.site_title = "Campus Connect Admin"
admin.site.index_title = "Marketplace management"

api_patterns = [
    path("auth/", include("accounts.urls")),
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("", include("products.urls")),
    path("orders/", include("orders.urls")),
    path("messages/", include("messaging.urls")),
    path("ai/", include("ai_features.urls")),
    path("health/", health_check, name="health-check"),
    # API documentation
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_patterns)),
]

# Serve uploaded product/profile images from MEDIA_ROOT (local folder in
# development, Render persistent disk in production).
if settings.SERVE_MEDIA:
    media_prefix = settings.MEDIA_URL.strip("/")
    urlpatterns += [re_path(rf"^{media_prefix}/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT})]
