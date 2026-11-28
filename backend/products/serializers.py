from django.conf import settings
from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from accounts.serializers import PublicUserSerializer
from core.validators import validate_image_file

from .filters import CONDITION_ALIASES
from .models import Category, Product, ProductImage, ProductReport


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "icon", "image", "product_count", "created_at"]


class CategorySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "icon"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "uploaded_at"]


class ConditionField(serializers.ChoiceField):
    """Accepts either the code (`like_new`) or the label (`Like New`)."""

    def __init__(self, **kwargs):
        super().__init__(choices=Product.Condition.choices, **kwargs)

    def to_internal_value(self, data):
        code = CONDITION_ALIASES.get(str(data).strip().lower())
        if code is None:
            self.fail("invalid_choice", input=data)
        return code


class ProductSerializer(serializers.ModelSerializer):
    """Read + write serializer for listings.

    Writes accept `category` as a slug and an optional list of `uploaded_images`
    (multipart/form-data). Reads return nested category, seller and image URLs.
    """

    category = serializers.SlugRelatedField(slug_field="slug", queryset=Category.objects.all())
    category_detail = CategorySummarySerializer(source="category", read_only=True)
    condition = ConditionField()
    condition_display = serializers.CharField(source="get_condition_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    seller = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(validators=[validate_image_file]),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "title", "description", "price", "original_price",
            "category", "category_detail", "condition", "condition_display",
            "status", "status_display", "is_available", "location", "campus",
            "seller", "images", "uploaded_images", "is_featured", "is_owner",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "campus", "seller", "is_featured", "created_at", "updated_at"]

    @extend_schema_field(PublicUserSerializer)
    def get_seller(self, obj):
        data = PublicUserSerializer(obj.seller, context=self.context).data
        annotated = getattr(obj, "seller_listing_count", None)
        if annotated is not None:
            data["listings"] = annotated
        return data

    def get_is_owner(self, obj) -> bool:
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.seller_id == request.user.id)

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 5:
            raise serializers.ValidationError("Use at least 5 characters for the title.")
        return value

    def validate_description(self, value):
        value = value.strip()
        if len(value) < 20:
            raise serializers.ValidationError("Add a few more details (at least 20 characters).")
        return value

    def validate_location(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Campus pickup location is required.")
        return value

    def validate_uploaded_images(self, files):
        limit = settings.MAX_IMAGES_PER_PRODUCT
        existing = self.instance.images.count() if self.instance else 0
        if existing + len(files) > limit:
            raise serializers.ValidationError(f"A listing can have at most {limit} images.")
        return files

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        original = attrs.get("original_price", getattr(self.instance, "original_price", None))
        if original is not None and price is not None and original < price:
            raise serializers.ValidationError({"original_price": "Original price cannot be lower than the selling price."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        images = validated_data.pop("uploaded_images", [])
        product = Product.objects.create(**validated_data)
        for f in images:
            ProductImage.objects.create(product=product, image=f)
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        images = validated_data.pop("uploaded_images", [])
        instance = super().update(instance, validated_data)
        for f in images:
            ProductImage.objects.create(product=instance, image=f)
        return instance


class ImageUploadSerializer(serializers.Serializer):
    images = serializers.ListField(
        child=serializers.ImageField(validators=[validate_image_file]), allow_empty=False
    )


class ProductStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Product.Status.choices)


class ProductReportSerializer(serializers.ModelSerializer):
    reason_display = serializers.CharField(source="get_reason_display", read_only=True)
    product_title = serializers.CharField(source="product.title", read_only=True)
    reporter_name = serializers.CharField(source="reporter.full_name", read_only=True)

    class Meta:
        model = ProductReport
        fields = ["id", "product", "product_title", "reporter_name", "reason", "reason_display", "details", "is_resolved", "created_at"]
        read_only_fields = ["id", "product", "product_title", "reporter_name", "is_resolved", "created_at"]
