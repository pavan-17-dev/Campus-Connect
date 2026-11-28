"""
Order business rules.

Every state change runs inside a database transaction and locks the affected
rows with SELECT ... FOR UPDATE, so concurrent requests (two buyers ordering
or a seller double-clicking "accept") cannot leave orders and product status
out of sync. The partial unique constraints on Order are the final safety net.

Lock ordering rule: always lock the PRODUCT row first, then the ORDER row.
Taking locks in one consistent order is what prevents deadlocks when two
requests touch orders for the same product at the same time.
"""
from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError

from products.models import Product

from .models import Order


class OrderConflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This action conflicts with the current state of the order or product."
    default_code = "conflict"


def _lock_product(product_id):
    try:
        # of=("self",) locks only the product row, not the joined seller row.
        return (
            Product.objects.select_for_update(of=("self",))
            .select_related("seller")
            .get(pk=product_id, seller__is_active=True)
        )
    except Product.DoesNotExist:
        raise NotFound("Product not found.")


def _lock_order_and_product(order_id):
    """Lock product → order (see the lock ordering rule above)."""
    product_id = Order.objects.filter(pk=order_id).values_list("product_id", flat=True).first()
    product = Product.objects.select_for_update().filter(pk=product_id).first() if product_id else None
    order = Order.objects.select_for_update().get(pk=order_id)
    return order, product


def place_order(*, buyer, product_id, quantity=1, note="", meeting_point=""):
    with transaction.atomic():
        product = _lock_product(product_id)
        if product.seller_id == buyer.id:
            raise PermissionDenied("You cannot buy your own product.")
        if product.status != Product.Status.AVAILABLE:
            raise OrderConflict("This product is no longer available.")
        if Order.objects.filter(buyer=buyer, product=product, status__in=Order.ACTIVE_STATUSES).exists():
            raise OrderConflict("You already have an active order for this product.")
        if quantity != 1:
            raise ValidationError({"quantity": ["Each listing is a single item, so the quantity must be 1."]})
        try:
            with transaction.atomic():
                return Order.objects.create(
                    buyer=buyer,
                    seller=product.seller,
                    product=product,
                    product_title=product.title,
                    unit_price=product.price,
                    quantity=quantity,
                    total_price=product.price * quantity,
                    note=note,
                    meeting_point=meeting_point or product.location,
                )
        except IntegrityError:
            raise OrderConflict("You already have an active order for this product.")


def _require(order, user, role):
    owner_id = order.seller_id if role == "seller" else order.buyer_id
    if owner_id != user.id:
        raise PermissionDenied(f"Only the {role} can perform this action.")


def _require_status(order, *allowed):
    if order.status not in allowed:
        raise OrderConflict(f"This order is {order.get_status_display().lower()} and can no longer be changed this way.")


def accept_order(*, order_id, user):
    """Seller accepts: product becomes reserved, other pending requests are rejected."""
    with transaction.atomic():
        order, product = _lock_order_and_product(order_id)
        _require(order, user, "seller")
        _require_status(order, Order.Status.PENDING)
        if product is None:
            raise OrderConflict("This listing has been removed.")
        if product.status != Product.Status.AVAILABLE:
            raise OrderConflict("This product is no longer available.")
        order.status = Order.Status.ACCEPTED
        order.save(update_fields=["status", "updated_at"])
        product.status = Product.Status.RESERVED
        product.save(update_fields=["status", "updated_at"])
        Order.objects.filter(product=product, status=Order.Status.PENDING).exclude(pk=order.pk).update(
            status=Order.Status.REJECTED
        )
        return order


def reject_order(*, order_id, user):
    with transaction.atomic():
        order, _ = _lock_order_and_product(order_id)
        _require(order, user, "seller")
        _require_status(order, Order.Status.PENDING)
        order.status = Order.Status.REJECTED
        order.save(update_fields=["status", "updated_at"])
        return order


def cancel_order(*, order_id, user):
    """Buyer cancels a pending or accepted order; an accepted item becomes available again."""
    with transaction.atomic():
        order, product = _lock_order_and_product(order_id)
        _require(order, user, "buyer")
        _require_status(order, Order.Status.PENDING, Order.Status.ACCEPTED)
        was_accepted = order.status == Order.Status.ACCEPTED
        order.status = Order.Status.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        if was_accepted and product and product.status == Product.Status.RESERVED:
            product.status = Product.Status.AVAILABLE
            product.save(update_fields=["status", "updated_at"])
        return order


def complete_order(*, order_id, user):
    """Seller confirms the campus hand-over: the product is marked sold."""
    with transaction.atomic():
        order, product = _lock_order_and_product(order_id)
        _require(order, user, "seller")
        _require_status(order, Order.Status.ACCEPTED)
        order.status = Order.Status.COMPLETED
        order.save(update_fields=["status", "updated_at"])
        if product:
            product.status = Product.Status.SOLD
            product.save(update_fields=["status", "updated_at"])
        return order
