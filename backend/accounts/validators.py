from django.conf import settings
from rest_framework import serializers


def validate_college_email(email):
    """Configurable college-email check (see REQUIRE_COLLEGE_EMAIL in settings)."""
    if not settings.REQUIRE_COLLEGE_EMAIL:
        return email
    domain = email.rsplit("@", 1)[-1].lower()
    allowed_domains = [d.lower().lstrip("@") for d in settings.ALLOWED_EMAIL_DOMAINS]
    if allowed_domains:
        if domain not in allowed_domains:
            raise serializers.ValidationError("Please register with your official college email address.")
        return email
    if not any(domain.endswith(suffix.lower()) for suffix in settings.COLLEGE_EMAIL_SUFFIXES):
        raise serializers.ValidationError(
            "Please use your college email (for example name@college.ac.in or name@university.edu)."
        )
    return email
