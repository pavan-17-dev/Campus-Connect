from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsSellerOrReadOnly(BasePermission):
    """Anyone can read. Only the seller may edit; the seller or an administrator may delete."""

    message = "Only the seller can modify this listing."

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not user.is_authenticated:
            return False
        if request.method == "DELETE" and user.is_admin:
            return True  # moderation
        return obj.seller_id == user.id
