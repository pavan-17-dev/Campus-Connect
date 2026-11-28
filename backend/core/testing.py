"""Shared helpers for the test suite."""
import io
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APITestCase

from products.models import Category, Product

User = get_user_model()
PASSWORD = "Str0ng-Pass!42"


def make_user(email="student@bmsce.ac.in", **extra):
    extra.setdefault("full_name", "Test Student")
    extra.setdefault("college", "BMS College of Engineering")
    return User.objects.create_user(email=email, password=PASSWORD, **extra)


def make_admin(email="admin@campusconnect.ac.in"):
    return make_user(email=email, full_name="Admin User", role=User.Role.ADMIN)


def category(slug="books"):
    return Category.objects.get(slug=slug)  # created by the 0002 data migration


def make_product(seller, **extra):
    data = {
        "title": "Engineering Mathematics Textbook",
        "description": "Higher Engineering Mathematics, 44th edition, lightly used.",
        "price": Decimal("450.00"),
        "category": category(extra.pop("category_slug", "books")),
        "condition": Product.Condition.GOOD,
        "location": "Main Library",
    }
    data.update(extra)
    return Product.objects.create(seller=seller, **data)


def image_file(name="photo.jpg", size=(60, 40), fmt="JPEG", color="#2563EB"):
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, format=fmt)
    content_type = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp", "GIF": "image/gif"}[fmt]
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=content_type)


class APITestBase(APITestCase):
    """Clears the throttle cache so rate limits never leak between tests."""

    def setUp(self):
        super().setUp()
        cache.clear()

    def login(self, user):
        self.client.force_authenticate(user=user)
        return user
