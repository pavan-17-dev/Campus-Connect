from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify

from core.validators import validate_image_file

MIN_PRICE = Decimal("1.00")
MAX_PRICE = Decimal("500000.00")


def category_image_path(instance, filename):
    return f"categories/{instance.slug}/{filename}"


def product_image_path(instance, filename):
    return f"products/{instance.product_id}/{filename}"


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=80, unique=True, help_text="Used in URLs, e.g. ?category=books")
    description = models.CharField(max_length=255, blank=True)
    icon = models.CharField(max_length=40, blank=True, help_text="Bootstrap icon class used by the frontend, e.g. bi-book")
    image = models.ImageField(upload_to=category_image_path, blank=True, null=True, validators=[validate_image_file])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class ProductQuerySet(models.QuerySet):
    def visible(self):
        """Listings shown in the public marketplace (seller account still active)."""
        return self.filter(seller__is_active=True)

    def available(self):
        return self.filter(status=Product.Status.AVAILABLE)

    def with_related(self):
        return self.select_related("category", "seller").prefetch_related("images").annotate(
            seller_listing_count=models.Count("seller__products", distinct=True)
        )


class Product(models.Model):
    class Condition(models.TextChoices):
        NEW = "new", "New"
        LIKE_NEW = "like_new", "Like New"
        GOOD = "good", "Good"
        USED = "used", "Used"

    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        RESERVED = "reserved", "Reserved"
        SOLD = "sold", "Sold"

    title = models.CharField(max_length=120)
    description = models.TextField(max_length=2000)
    price = models.DecimalField(
        max_digits=9,
        decimal_places=2,
        validators=[MinValueValidator(MIN_PRICE), MaxValueValidator(MAX_PRICE)],
        help_text="Price in Indian Rupees (₹).",
    )
    original_price = models.DecimalField(
        max_digits=9,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(MIN_PRICE), MaxValueValidator(MAX_PRICE)],
        help_text="Optional original / MRP price, used to show the discount.",
    )
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="products")
    condition = models.CharField(max_length=10, choices=Condition.choices, default=Condition.GOOD)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.AVAILABLE, db_index=True)
    location = models.CharField(max_length=150, help_text="Pickup spot on campus, e.g. Main Library entrance")
    campus = models.CharField(max_length=200, blank=True, help_text="College / campus name (defaults to the seller's college)")
    is_featured = models.BooleanField(default=False, help_text="Shown in 'Featured Products' on the home page")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ProductQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["category", "status"]),
            models.Index(fields=["price"]),
            models.Index(fields=["seller", "-created_at"]),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(price__gt=0), name="product_price_positive"),
        ]

    def __str__(self):
        return self.title

    @property
    def is_available(self):
        return self.status == self.Status.AVAILABLE

    def save(self, *args, **kwargs):
        if not self.campus and self.seller_id:
            self.campus = self.seller.college
        super().save(*args, **kwargs)


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to=product_image_path, validators=[validate_image_file])
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["uploaded_at", "id"]

    def __str__(self):
        return f"Image {self.pk} of {self.product}"

    def delete(self, *args, **kwargs):
        storage, name = self.image.storage, self.image.name
        super().delete(*args, **kwargs)
        if name:
            storage.delete(name)


class ProductReport(models.Model):
    """A student flags a suspicious or inappropriate listing for admin review."""

    class Reason(models.TextChoices):
        SOLD = "sold", "Item already sold"
        MISLEADING = "misleading", "Misleading description"
        PRICE = "price", "Suspicious price"
        PROHIBITED = "prohibited", "Prohibited item"
        SPAM = "spam", "Spam or duplicate"
        OTHER = "other", "Other"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_reports")
    reason = models.CharField(max_length=20, choices=Reason.choices)
    details = models.CharField(max_length=500, blank=True)
    is_resolved = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["product", "reporter"], name="one_report_per_user_per_product"),
        ]

    def __str__(self):
        return f"{self.get_reason_display()} – {self.product}"
