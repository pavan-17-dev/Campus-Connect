from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@extend_schema(tags=["health"], responses={200: dict, 503: dict})
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def health_check(request):
    """Used by Render's health check. Verifies the database connection."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return Response({"status": "ok", "database": "ok"})
    except Exception:  # noqa: BLE001 – report unhealthy instead of crashing
        return Response({"status": "error", "database": "unavailable"}, status=503)


# --------------------------------------------------------------------------- #
# Administrator dashboard statistics
# --------------------------------------------------------------------------- #
from datetime import timedelta  # noqa: E402

from django.contrib.auth import get_user_model  # noqa: E402
from django.db.models import Count  # noqa: E402
from django.db.models.functions import TruncMonth  # noqa: E402
from django.utils import timezone  # noqa: E402
from rest_framework.views import APIView  # noqa: E402

from accounts.permissions import IsAdminRole  # noqa: E402


@extend_schema(tags=["admin"], responses={200: dict})
class AdminStatsView(APIView):
    """GET /api/admin/stats/ – numbers for the React admin dashboard (administrators only)."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        from orders.models import Order
        from products.models import Category, Product, ProductReport

        User = get_user_model()
        now = timezone.now()
        six_months_ago = (now - timedelta(days=183)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        per_month = (
            Product.objects.filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(value=Count("id"))
            .order_by("month")
        )
        orders_by_status = dict(Order.objects.values_list("status").annotate(n=Count("id")))

        activity = []
        for user in User.objects.order_by("-date_joined")[:5]:
            activity.append({"type": "user", "text": f"{user.full_name} registered from {user.college}", "at": user.date_joined})
        for product in Product.objects.select_related("seller").order_by("-created_at")[:5]:
            activity.append({"type": "product", "text": f'{product.seller.full_name} listed "{product.title}"', "at": product.created_at})
        for order in Order.objects.order_by("-updated_at")[:5]:
            activity.append({"type": "order", "text": f'Order for "{order.product_title}" is {order.get_status_display().lower()}', "at": order.updated_at})
        for report in ProductReport.objects.select_related("product").order_by("-created_at")[:5]:
            activity.append({"type": "report", "text": f'"{report.product.title}" was reported: {report.get_reason_display().lower()}', "at": report.created_at})
        activity.sort(key=lambda item: item["at"], reverse=True)

        return Response(
            {
                "total_students": User.objects.filter(role=User.Role.STUDENT).count(),
                "total_listings": Product.objects.count(),
                "active_listings": Product.objects.filter(status=Product.Status.AVAILABLE).count(),
                "reported_products": ProductReport.objects.filter(is_resolved=False).values("product").distinct().count(),
                "orders": {status: orders_by_status.get(status, 0) for status, _ in Order.Status.choices},
                "listings_per_month": [{"month": row["month"].strftime("%b %Y"), "value": row["value"]} for row in per_month],
                "listings_by_category": list(
                    Category.objects.annotate(count=Count("products")).values("slug", "name", "count").order_by("-count")
                ),
                "recent_activity": activity[:8],
            }
        )
