from rest_framework.throttling import SimpleRateThrottle


class _AIThrottle(SimpleRateThrottle):
    """Keyed by user id when logged in, otherwise by IP address."""

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user and request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class AIBurstThrottle(_AIThrottle):
    scope = "ai"  # THROTTLE_AI, default 10/min


class AIDailyThrottle(_AIThrottle):
    scope = "ai_daily"  # THROTTLE_AI_DAILY, default 100/day
