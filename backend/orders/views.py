from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from . import services
from .models import Order
from .serializers import OrderCreateSerializer, OrderSerializer


@extend_schema(tags=["orders"])
class OrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Orders are only visible to the buyer and seller involved. Anyone else gets 404
    (the order is not even revealed to exist).
    """

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_value_regex = r"\d+"
    filterset_fields = ["status"]
    ordering_fields = ["created_at", "total_price"]
    search_fields = ["product_title"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # schema generation
            return Order.objects.none()
        user = self.request.user
        queryset = Order.objects.select_related("buyer", "seller", "product").prefetch_related("product__images")
        role = self.request.query_params.get("role")
        if role == "buyer":
            return queryset.filter(buyer=user)
        if role == "seller":
            return queryset.filter(seller=user)
        return queryset.filter(Q(buyer=user) | Q(seller=user))

    @extend_schema(
        summary="All my orders (as buyer and seller)",
        parameters=[OpenApiParameter("role", str, enum=["buyer", "seller"]), OpenApiParameter("status", str)],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(summary="Place an order for an available product", request=OrderCreateSerializer, responses={201: OrderSerializer})
    def create(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        order = services.place_order(
            buyer=request.user,
            product_id=data["product"],
            quantity=data["quantity"],
            note=data["note"].strip(),
            meeting_point=data["meeting_point"].strip(),
        )
        return Response(self._serialize(order), status=status.HTTP_201_CREATED)

    @extend_schema(summary="Orders I placed (buyer)")
    @action(detail=False, methods=["get"], url_path="my-orders")
    def my_orders(self, request):
        return self._list(self.get_queryset().filter(buyer=request.user))

    @extend_schema(summary="Orders received for my listings (seller)")
    @action(detail=False, methods=["get"], url_path="seller-orders")
    def seller_orders(self, request):
        return self._list(self.get_queryset().filter(seller=request.user))

    @extend_schema(summary="Seller accepts a pending order", request=None)
    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        return self._transition(services.accept_order, pk)

    @extend_schema(summary="Seller rejects a pending order", request=None)
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._transition(services.reject_order, pk)

    @extend_schema(summary="Buyer cancels a pending or accepted order", request=None)
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._transition(services.cancel_order, pk)

    @extend_schema(summary="Seller marks an accepted order as completed", request=None)
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        return self._transition(services.complete_order, pk)

    # ------------------------------------------------------------------ #
    def _transition(self, service, pk):
        order = self.get_object()  # 404 unless the user is the buyer or seller
        order = service(order_id=order.pk, user=self.request.user)
        return Response(self._serialize(order))

    def _serialize(self, order):
        order = self.get_queryset().get(pk=order.pk) if order.pk else order
        return OrderSerializer(order, context=self.get_serializer_context()).data

    def _list(self, queryset):
        queryset = self.filter_queryset(queryset)
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)
