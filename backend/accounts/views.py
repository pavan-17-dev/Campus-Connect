from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import filters, generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import User
from .permissions import IsAdminRole
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
    tokens_for,
)

AuthResponse = inline_serializer(
    "AuthResponse",
    {"access": serializers.CharField(), "refresh": serializers.CharField(), "user": UserSerializer()},
)
DetailResponse = inline_serializer("DetailResponse", {"detail": serializers.CharField()})


class AuthThrottleMixin:
    """Rate-limit sensitive auth endpoints (see THROTTLE_AUTH in settings)."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


@extend_schema(tags=["auth"], request=RegisterSerializer, responses={201: AuthResponse})
class RegisterView(AuthThrottleMixin, generics.CreateAPIView):
    """Create a student account and return JWT tokens so the user is logged in straight away."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"detail": "Account created successfully.", "user": UserSerializer(user, context={"request": request}).data, **tokens_for(user)},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["auth"], request=LoginSerializer, responses={200: AuthResponse})
class LoginView(AuthThrottleMixin, APIView):
    """Log in with email + password. Returns an access token, a refresh token and the user."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return Response({"user": UserSerializer(user, context={"request": request}).data, **tokens_for(user)})


@extend_schema(tags=["auth"], request=LogoutSerializer, responses={200: DetailResponse})
class LogoutView(APIView):
    """Invalidate (blacklist) the refresh token. The short-lived access token simply expires."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            if str(token.get("user_id")) != str(request.user.pk):
                return Response({"detail": "This token does not belong to you."}, status=status.HTTP_400_BAD_REQUEST)
            token.blacklist()
        except TokenError:
            return Response({"detail": "Token is invalid or already logged out."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Logged out successfully."})


@extend_schema(tags=["auth"])
class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


@extend_schema(tags=["auth"])
class ProfileView(generics.RetrieveUpdateAPIView):
    """GET / PATCH the logged-in user's own profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        return UserSerializer if self.request.method == "GET" else ProfileUpdateSerializer

    @extend_schema(request=ProfileUpdateSerializer, responses={200: UserSerializer})
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", request.method == "PATCH")
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={"request": request}).data)


@extend_schema(tags=["auth"], request=ChangePasswordSerializer, responses={200: DetailResponse})
class ChangePasswordView(AuthThrottleMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"detail": "Password changed successfully."})


@extend_schema(tags=["auth"], request=PasswordResetRequestSerializer, responses={200: DetailResponse})
class PasswordResetRequestView(AuthThrottleMixin, APIView):
    """Emails a reset link. Always answers the same way so emails can't be enumerated."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?uid={uid}&token={token}"
            send_mail(
                "Reset your Campus Connect password",
                f"Hi {user.full_name},\n\nUse this link to reset your password:\n{link}\n\n"
                "If you didn't request this, you can ignore this email.",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
        return Response({"detail": "If an account exists for this email, a reset link has been sent."})


@extend_schema(tags=["auth"], request=PasswordResetConfirmSerializer, responses={200: DetailResponse})
class PasswordResetConfirmView(AuthThrottleMixin, APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password has been reset. You can now log in."})


# --------------------------------------------------------------------------- #
# Administrator-only user management (used by the React admin dashboard)
# --------------------------------------------------------------------------- #
class AdminUserSerializer(UserSerializer):
    listings = serializers.IntegerField(source="listing_count", read_only=True)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["is_active", "listings"]
        read_only_fields = [f for f in UserSerializer.Meta.fields if f != "role"] + ["listings"]
        # is_active and role are the only fields an administrator edits here.


@extend_schema(tags=["admin"])
class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = AdminUserSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["full_name", "email", "college", "student_id"]
    ordering_fields = ["date_joined", "full_name"]

    def get_queryset(self):
        from django.db.models import Count

        return User.objects.annotate(listing_count=Count("products"))


@extend_schema(tags=["admin"])
class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """Activate / suspend a user (is_active) or change their role."""

    permission_classes = [IsAdminRole]
    serializer_class = AdminUserSerializer
    http_method_names = ["get", "patch"]

    def get_queryset(self):
        from django.db.models import Count

        return User.objects.annotate(listing_count=Count("products"))

    def perform_update(self, serializer):
        if serializer.instance == self.request.user and self.request.data.get("is_active") in (False, "false"):
            raise serializers.ValidationError({"is_active": "You cannot suspend your own account."})
        serializer.save()
