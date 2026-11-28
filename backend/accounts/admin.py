from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["-date_joined"]
    list_display = ["email", "full_name", "college", "student_id", "role", "is_active", "is_staff", "date_joined"]
    list_filter = ["role", "is_active", "is_staff", "is_email_verified", "college"]
    search_fields = ["email", "full_name", "username", "student_id", "college"]
    readonly_fields = ["date_joined", "last_login"]
    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        ("Profile", {"fields": ("full_name", "phone", "college", "student_id", "profile_picture", "bio")}),
        ("Access", {"fields": ("role", "is_active", "is_email_verified", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "full_name", "college", "role", "password1", "password2"),
        }),
    )
