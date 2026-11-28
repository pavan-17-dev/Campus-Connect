from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Order(models.Model):
    """
    A buyer's request to purchase a listing. Payment happens offline (cash/UPI)
    at a campus pickup – there is intentionally no payment gateway.

    Lifecycle:  pending ──accept──▶ accepted ──complete──▶ completed
                   │ └──reject──▶ rejected        │
                   └──cancel──▶ cancelled ◀──cancel┘
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    ACTIVE_STATUSES = (Status.PENDING, Status.ACCEPTED)

    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders_placed")
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders_received")
    # SET_NULL keeps the order history if a listing is later deleted; the
    # title/price snapshot below still describes what was bought.
    product = models.ForeignKey("products.Product", on_delete=models.SET_NULL, null=True, related_name="orders")
    product_title = models.CharField(max_length=120)
    unit_price = models.DecimalField(max_digits=9, decimal_places=2)
    # Every listing is a single second-hand item, so quantity is currently always 1.
    quantity = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(1)])
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    note = models.CharField(max_length=500, blank=True, help_text="Optional message from the buyer")
    meeting_point = models.CharField(max_length=150, blank=True, help_text="Agreed campus pickup spot")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["buyer", "-created_at"]),
            models.Index(fields=["seller", "-created_at"]),
            models.Index(fields=["product", "status"]),
        ]
        constraints = [
            # A buyer can only have one open order per product (no duplicates).
            models.UniqueConstraint(
                fields=["buyer", "product"],
                condition=models.Q(status__in=["pending", "accepted"]),
                name="unique_active_order_per_buyer_and_product",
            ),
            # At most one accepted order per product (no double-selling).
            models.UniqueConstraint(
                fields=["product"],
                condition=models.Q(status="accepted"),
                name="one_accepted_order_per_product",
            ),
            models.CheckConstraint(condition=~models.Q(buyer=models.F("seller")), name="order_buyer_is_not_seller"),
            models.CheckConstraint(condition=models.Q(quantity__gte=1), name="order_quantity_positive"),
            models.CheckConstraint(condition=models.Q(total_price__gte=0), name="order_total_not_negative"),
        ]

    def __str__(self):
        return f"Order #{self.pk} – {self.product_title} ({self.get_status_display()})"

    @property
    def is_active(self):
        return self.status in self.ACTIVE_STATUSES
