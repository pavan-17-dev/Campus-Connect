from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Only users with the administrator role (or Django superusers)."""

    message = "Administrator access is required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)
