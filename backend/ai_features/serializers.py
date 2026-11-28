import re

from rest_framework import serializers

from products.filters import CONDITION_ALIASES
from products.models import Category, Product

# Very small guard against prompt-injection style input and pasted links/contacts.
BLOCKED_PATTERNS = [re.compile(p, re.I) for p in (r"https?://", r"ignore (all|previous) instructions", r"<script")]


def _clean_text(value, field):
    value = " ".join(str(value).split())  # collapse whitespace / newlines
    for pattern in BLOCKED_PATTERNS:
        if pattern.search(value):
            raise serializers.ValidationError(f"Please remove links or instructions from the {field}.")
    return value


class GenerateDescriptionSerializer(serializers.Serializer):
    title = serializers.CharField(min_length=3, max_length=120)
    category = serializers.CharField(max_length=80, help_text="Category slug or name, e.g. 'books'")
    condition = serializers.CharField(max_length=20, help_text="new, like_new, good, used (or the label)")
    details = serializers.CharField(
        max_length=600, required=False, allow_blank=True, default="",
        help_text="Basic facts: brand, model, edition, age, defects, what's included…",
    )
    price = serializers.DecimalField(max_digits=9, decimal_places=2, required=False, min_value=1)

    def validate_title(self, value):
        return _clean_text(value, "title")

    def validate_details(self, value):
        return _clean_text(value, "details") if value else ""

    def validate_category(self, value):
        category = Category.objects.filter(slug__iexact=value.strip()).first() or Category.objects.filter(
            name__iexact=value.strip()
        ).first()
        if not category:
            raise serializers.ValidationError("Unknown category.")
        return category

    def validate_condition(self, value):
        code = CONDITION_ALIASES.get(value.strip().lower())
        if not code:
            raise serializers.ValidationError("Condition must be New, Like New, Good or Used.")
        return Product.Condition(code).label


class GeneratedDescriptionSerializer(serializers.Serializer):
    description = serializers.CharField()
    model = serializers.CharField()
    requires_review = serializers.BooleanField(help_text="Always true – the student must review before publishing")


class ChatTurnSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    text = serializers.CharField(max_length=1000, allow_blank=True)


class AssistantSerializer(serializers.Serializer):
    message = serializers.CharField(min_length=1, max_length=500)
    history = ChatTurnSerializer(many=True, required=False, default=list)

    def validate_message(self, value):
        value = " ".join(value.split())
        if not value:
            raise serializers.ValidationError("Message cannot be empty.")
        return value

    def validate_history(self, value):
        return value[-10:]  # keep the prompt small
