from django.contrib import admin
from django.utils.html import format_html

from .models import Category, Product, ProductImage, ProductReport


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "icon", "product_count", "created_at"]
    search_fields = ["name", "slug", "description"]
    prepopulated_fields = {"slug": ("name",)}

    @admin.display(description="Products")
    def product_count(self, obj):
        return obj.products.count()


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    readonly_fields = ["preview", "uploaded_at"]
    fields = ["image", "preview", "uploaded_at"]

    @admin.display(description="Preview")
    def preview(self, obj):
        return format_html('<img src="{}" style="height:60px;border-radius:6px">', obj.image.url) if obj.image else "–"


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["title", "price", "category", "seller", "condition", "status", "is_featured", "campus", "created_at"]
    list_filter = ["status", "condition", "category", "is_featured", "created_at"]
    list_editable = ["status", "is_featured"]
    search_fields = ["title", "description", "seller__email", "seller__full_name", "campus", "location"]
    autocomplete_fields = ["seller", "category"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "created_at"
    inlines = [ProductImageInline]
    list_select_related = ["category", "seller"]
    actions = ["mark_sold", "mark_available"]

    @admin.action(description="Mark selected listings as sold")
    def mark_sold(self, request, queryset):
        queryset.update(status=Product.Status.SOLD)

    @admin.action(description="Mark selected listings as available")
    def mark_available(self, request, queryset):
        queryset.update(status=Product.Status.AVAILABLE)


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ["id", "product", "image", "uploaded_at"]
    search_fields = ["product__title"]
    list_filter = ["uploaded_at"]
    autocomplete_fields = ["product"]


@admin.register(ProductReport)
class ProductReportAdmin(admin.ModelAdmin):
    list_display = ["product", "reason", "reporter", "is_resolved", "created_at"]
    list_filter = ["reason", "is_resolved", "created_at"]
    list_editable = ["is_resolved"]
    search_fields = ["product__title", "reporter__email", "details"]
    autocomplete_fields = ["product", "reporter"]
