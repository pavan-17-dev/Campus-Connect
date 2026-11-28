from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("categories", views.CategoryViewSet, basename="category")
router.register("products", views.ProductViewSet, basename="product")
router.register("admin/reports", views.AdminReportViewSet, basename="admin-report")

urlpatterns = [
    path("categories/<slug:slug>/products/", views.CategoryProductsView.as_view(), name="category-products"),
    path("sellers/<int:seller_id>/products/", views.SellerProductsView.as_view(), name="seller-products"),
    path("recommendations/", views.RecommendationsView.as_view(), name="recommendations"),
    path("", include(router.urls)),
]
