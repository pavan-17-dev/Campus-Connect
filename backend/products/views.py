from django.conf import settings
from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import IsAdminRole

from .filters import ProductFilter
from .models import Category, Product, ProductImage, ProductReport
from .permissions import IsSellerOrReadOnly
from .serializers import (
    CategorySerializer,
    ImageUploadSerializer,
    ProductImageSerializer,
    ProductReportSerializer,
    ProductSerializer,
    ProductStatusSerializer,
)

ACTIVE_ORDER_STATUSES = ("pending", "accepted")


# --------------------------------------------------------------------------- #
# Categories
# --------------------------------------------------------------------------- #
@extend_schema(tags=["categories"])
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Categories are managed in the Django admin; the API is read-only."""

    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    pagination_class = None
    filter_backends = []

    def get_queryset(self):
        return Category.objects.annotate(
            product_count=Count("products", filter=Q(products__seller__is_active=True), distinct=True)
        )


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
@extend_schema_view(
    list=extend_schema(
        summary="List products",
        parameters=[
            OpenApiParameter("search", str, description="Search title and description"),
            OpenApiParameter("ordering", str, description="price, -price, created_at, -created_at"),
        ],
    ),
    create=extend_schema(summary="Create a listing (JSON or multipart with uploaded_images)"),
)
@extend_schema(tags=["products"])
class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsSellerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["title", "description"]
    ordering_fields = ["price", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Product.objects.visible().with_related()

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    def perform_destroy(self, instance):
        if instance.orders.filter(status__in=ACTIVE_ORDER_STATUSES).exists():
            raise ValidationError(
                {"detail": "This listing has an active order. Cancel or complete the order before deleting it."}
            )
        for image in instance.images.all():
            image.delete()  # also removes the file from storage
        instance.delete()

    # ---- Collections ------------------------------------------------------ #
    @extend_schema(summary="Current user's listings (all statuses)")
    @action(detail=False, methods=["get"], url_path="my-products", permission_classes=[permissions.IsAuthenticated])
    def my_products(self, request):
        queryset = self.filter_queryset(Product.objects.with_related().filter(seller=request.user))
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    @extend_schema(summary="Featured listings for the home page", responses=ProductSerializer(many=True))
    @action(detail=False, methods=["get"], pagination_class=None)
    def featured(self, request):
        limit = _limit(request, default=6)
        base = self.get_queryset().available()
        items = list(base.filter(is_featured=True)[:limit])
        if len(items) < limit:  # top up with the newest listings so the section is never empty
            items += list(base.exclude(pk__in=[p.pk for p in items])[: limit - len(items)])
        return Response(self.get_serializer(items, many=True).data)

    @extend_schema(summary="Related listings (same category first)", responses=ProductSerializer(many=True))
    @action(detail=True, methods=["get"], pagination_class=None)
    def related(self, request, pk=None):
        product = self.get_object()
        limit = _limit(request, default=4)
        base = self.get_queryset().available().exclude(pk=product.pk)
        items = list(base.filter(category=product.category)[:limit])
        if len(items) < limit:
            items += list(base.exclude(pk__in=[p.pk for p in items])[: limit - len(items)])
        return Response(self.get_serializer(items, many=True).data)

    # ---- Images ----------------------------------------------------------- #
    @extend_schema(
        summary="Upload images to a listing (multipart field: images)",
        request={"multipart/form-data": ImageUploadSerializer},
        responses={201: ProductImageSerializer(many=True)},
    )
    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsSellerOrReadOnly])
    def images(self, request, pk=None):
        product = self.get_object()
        serializer = ImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        files = serializer.validated_data["images"]
        limit = settings.MAX_IMAGES_PER_PRODUCT
        if product.images.count() + len(files) > limit:
            raise ValidationError({"images": [f"A listing can have at most {limit} images."]})
        created = [ProductImage.objects.create(product=product, image=f) for f in files]
        return Response(ProductImageSerializer(created, many=True, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Delete one image from a listing", responses={204: None})
    @action(
        detail=True,
        methods=["delete"],
        url_path=r"images/(?P<image_id>\d+)",
        permission_classes=[permissions.IsAuthenticated, IsSellerOrReadOnly],
    )
    def delete_image(self, request, pk=None, image_id=None):
        product = self.get_object()
        if product.seller_id != request.user.id:
            return Response({"detail": "Only the seller can modify this listing."}, status=status.HTTP_403_FORBIDDEN)
        get_object_or_404(ProductImage, pk=image_id, product=product).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ---- Availability ----------------------------------------------------- #
    @extend_schema(summary="Update availability (available / reserved / sold)", request=ProductStatusSerializer)
    @action(detail=True, methods=["patch"], url_path="status", permission_classes=[permissions.IsAuthenticated, IsSellerOrReadOnly])
    def update_status(self, request, pk=None):
        product = self.get_object()
        if product.seller_id != request.user.id:
            return Response({"detail": "Only the seller can modify this listing."}, status=status.HTTP_403_FORBIDDEN)
        serializer = ProductStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if product.orders.filter(status="accepted").exists():
            return Response(
                {"detail": "This item has an accepted order. Complete or cancel that order to change its status."},
                status=status.HTTP_409_CONFLICT,
            )
        product.status = serializer.validated_data["status"]
        product.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(product).data)

    # ---- Reports ---------------------------------------------------------- #
    @extend_schema(summary="Report a listing to administrators", request=ProductReportSerializer, responses={201: ProductReportSerializer})
    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def report(self, request, pk=None):
        product = self.get_object()
        if product.seller_id == request.user.id:
            return Response({"detail": "You cannot report your own listing."}, status=status.HTTP_400_BAD_REQUEST)
        if ProductReport.objects.filter(product=product, reporter=request.user).exists():
            return Response({"detail": "You have already reported this listing."}, status=status.HTTP_409_CONFLICT)
        serializer = ProductReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(product=product, reporter=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


def _limit(request, default, maximum=24):
    try:
        return max(1, min(int(request.query_params.get("limit", default)), maximum))
    except (TypeError, ValueError):
        return default


class FilteredProductListView(generics.ListAPIView):
    """Shared configuration: same search / filters / ordering as /api/products/."""

    queryset = Product.objects.none()  # real queryset comes from get_queryset()

    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["title", "description"]
    ordering_fields = ["price", "created_at"]
    ordering = ["-created_at"]


@extend_schema(tags=["products"], summary="Listings in one category")
class CategoryProductsView(FilteredProductListView):
    """GET /api/categories/<slug>/products/"""

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Product.objects.none()
        category = get_object_or_404(Category, slug=self.kwargs["slug"])
        return Product.objects.visible().with_related().filter(category=category)


@extend_schema(tags=["products"], summary="Listings of one seller")
class SellerProductsView(FilteredProductListView):
    """GET /api/sellers/<id>/products/ – a seller's public listings."""

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Product.objects.none()
        return Product.objects.visible().with_related().filter(seller_id=self.kwargs["seller_id"])


@extend_schema(
    tags=["products"],
    summary="Personalised recommendations",
    parameters=[
        OpenApiParameter("categories", str, description="Comma-separated category slugs the student is interested in"),
        OpenApiParameter("limit", int),
    ],
    responses=ProductSerializer(many=True),
)
class RecommendationsView(generics.GenericAPIView):
    """
    Ranks available listings by the student's interests: categories passed by the
    frontend plus categories of items they ordered or asked about. Falls back to
    the newest listings. Excludes the student's own items.
    """

    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    filter_backends = []

    def get(self, request):
        limit = _limit(request, default=4)
        interests = [c.strip() for c in request.query_params.get("categories", "").split(",") if c.strip()]
        base = Product.objects.visible().available().with_related()

        if request.user.is_authenticated:
            base = base.exclude(seller=request.user)
            history = (
                Category.objects.filter(
                    Q(products__orders__buyer=request.user) | Q(products__conversations__participant_one=request.user)
                    | Q(products__conversations__participant_two=request.user)
                )
                .values_list("slug", flat=True)
                .distinct()
            )
            interests += [slug for slug in history if slug not in interests]

        items = list(base.filter(category__slug__in=interests)[:limit]) if interests else []
        if len(items) < limit:
            items += list(base.exclude(pk__in=[p.pk for p in items])[: limit - len(items)])
        return Response(self.get_serializer(items, many=True).data)


# --------------------------------------------------------------------------- #
# Administrator: report moderation
# --------------------------------------------------------------------------- #
@extend_schema(tags=["admin"])
class AdminReportViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """List reports and mark them resolved (PATCH {"is_resolved": true})."""

    permission_classes = [IsAdminRole]
    serializer_class = ProductReportSerializer
    http_method_names = ["get", "patch"]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["is_resolved", "reason"]

    def get_queryset(self):
        return ProductReport.objects.select_related("product", "reporter")

    def partial_update(self, request, *args, **kwargs):
        report = self.get_object()
        report.is_resolved = bool(request.data.get("is_resolved", True))
        report.save(update_fields=["is_resolved"])
        return Response(self.get_serializer(report).data)
