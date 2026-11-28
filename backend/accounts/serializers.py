from django.contrib.auth import authenticate, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .validators import validate_college_email


def check_password_strength(password, user, field):
    """Run Django's password validators and attach any errors to `field`."""
    try:
        password_validation.validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({field: list(exc.messages)})


class UserSerializer(serializers.ModelSerializer):
    """Private profile of the logged-in user."""

    is_admin = serializers.BooleanField(read_only=True)
    initials = serializers.CharField(read_only=True)
    joined = serializers.DateTimeField(source="date_joined", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "full_name", "email", "username", "phone", "college", "student_id",
            "profile_picture", "bio", "role", "is_admin", "is_email_verified", "initials", "joined",
        ]
        read_only_fields = ["id", "email", "role", "is_admin", "is_email_verified", "joined"]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["full_name", "username", "phone", "college", "student_id", "profile_picture", "bio"]
        extra_kwargs = {"username": {"required": False}}

    def validate_full_name(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters.")
        return value


class PublicUserSerializer(serializers.ModelSerializer):
    """What other students can see about a seller – no email, phone or student ID."""

    name = serializers.CharField(source="full_name")
    avatar = serializers.CharField(source="initials")
    joined = serializers.DateTimeField(source="date_joined")
    listings = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name", "avatar", "profile_picture", "college", "joined", "listings"]

    def get_listings(self, obj) -> int:
        annotated = getattr(obj, "listing_count", None)
        return annotated if annotated is not None else obj.products.count()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    confirm_password = serializers.CharField(write_only=True, required=False, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["id", "full_name", "email", "college", "student_id", "phone", "password", "confirm_password"]

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return validate_college_email(value)

    def validate_full_name(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters.")
        return value

    def validate_student_id(self, value):
        value = value.strip().upper()
        if value and User.objects.filter(student_id__iexact=value).exists():
            raise serializers.ValidationError("This student ID is already registered.")
        return value

    def validate(self, attrs):
        confirm = attrs.pop("confirm_password", None)
        if confirm is not None and confirm != attrs["password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        candidate = User(email=attrs.get("email"), full_name=attrs.get("full_name", ""))
        check_password_strength(attrs["password"], candidate, "password")
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            email=attrs["email"].strip().lower(),
            password=attrs["password"],
        )
        if user is None:
            # Same message for unknown email / wrong password / inactive account.
            raise serializers.ValidationError("Invalid email or password.")
        attrs["user"] = user
        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True, required=False)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if "confirm_password" in attrs and attrs["confirm_password"] != attrs["new_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": "New password must be different from the current one."})
        check_password_strength(attrs["new_password"], self.context["request"].user, "new_password")
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(attrs["uid"])))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError("This reset link is invalid or has expired.")
        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError("This reset link is invalid or has expired.")
        check_password_strength(attrs["new_password"], user, "new_password")
        attrs["user"] = user
        return attrs
