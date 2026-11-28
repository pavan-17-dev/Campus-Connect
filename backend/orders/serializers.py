from rest_framework import serializers

from accounts.serializers import PublicUserSerializer

from .models import Order


class OrderProductSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    status = serializers.CharField()
    location = serializers.CharField()
    image = serializers.SerializerMethodField()

    def get_image(self, product) -> str | None:
        first = next(iter(product.images.all()), None)
        if not first:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(first.image.url) if request else first.image.url


class OrderSerializer(serializers.ModelSerializer):
    buyer = PublicUserSerializer(read_only=True)
    seller = PublicUserSerializer(read_only=True)
    product = OrderProductSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    role = serializers.SerializerMethodField(help_text="'buyer' or 'seller' – the current user's side of the order")
    can_accept = serializers.SerializerMethodField()
    can_reject = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    can_complete = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "buyer", "seller", "product", "product_title", "unit_price", "quantity", "total_price",
            "status", "status_display", "note", "meeting_point", "role",
            "can_accept", "can_reject", "can_cancel", "can_complete", "created_at", "updated_at",
        ]

    def _user_id(self):
        request = self.context.get("request")
        return request.user.id if request else None

    def get_role(self, obj) -> str:
        return "seller" if obj.seller_id == self._user_id() else "buyer"

    def get_can_accept(self, obj) -> bool:
        return obj.seller_id == self._user_id() and obj.status == Order.Status.PENDING

    def get_can_reject(self, obj) -> bool:
        return self.get_can_accept(obj)

    def get_can_cancel(self, obj) -> bool:
        return obj.buyer_id == self._user_id() and obj.status in Order.ACTIVE_STATUSES

    def get_can_complete(self, obj) -> bool:
        return obj.seller_id == self._user_id() and obj.status == Order.Status.ACCEPTED


class OrderCreateSerializer(serializers.Serializer):
    product = serializers.IntegerField(help_text="ID of the product to buy")
    quantity = serializers.IntegerField(default=1, min_value=1, max_value=1)
    note = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    meeting_point = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
