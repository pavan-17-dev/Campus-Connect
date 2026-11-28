from django.contrib import admin

from .models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "product_title", "buyer", "seller", "total_price", "status", "created_at", "updated_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["product_title", "buyer__email", "buyer__full_name", "seller__email", "seller__full_name"]
    readonly_fields = ["product_title", "unit_price", "total_price", "created_at", "updated_at"]
    autocomplete_fields = ["buyer", "seller", "product"]
    date_hierarchy = "created_at"
    list_select_related = ["buyer", "seller"]
