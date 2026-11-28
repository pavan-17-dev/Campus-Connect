from rest_framework.routers import SimpleRouter

from .views import OrderViewSet

router = SimpleRouter()  # no API-root view, so "" can be the list URL
router.register("", OrderViewSet, basename="order")

urlpatterns = router.urls
