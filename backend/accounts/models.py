from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models

from core.validators import validate_image_file

from .managers import UserManager

phone_validator = RegexValidator(r"^[6-9]\d{9}$", "Enter a valid 10-digit Indian mobile number.")
student_id_validator = RegexValidator(r"^[A-Za-z0-9-]{4,20}$", "Student ID must be 4–20 letters, numbers or hyphens.")


def profile_picture_path(instance, filename):
    return f"profiles/{instance.pk or 'new'}/{filename}"


class User(AbstractUser):
    """Student / administrator account. Users log in with their email address."""

    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        ADMIN = "admin", "Administrator"

    # AbstractUser provides: id, username, password, is_active, is_staff, date_joined, last_login
    first_name = None
    last_name = None

    full_name = models.CharField(max_length=150)
    email = models.EmailField("email address", unique=True)
    phone = models.CharField(max_length=10, blank=True, validators=[phone_validator])
    college = models.CharField(max_length=200)
    student_id = models.CharField(max_length=20, blank=True, validators=[student_id_validator])
    profile_picture = models.ImageField(
        upload_to=profile_picture_path, blank=True, null=True, validators=[validate_image_file]
    )
    bio = models.CharField(max_length=300, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT, db_index=True)
    is_email_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    objects = UserManager()

    class Meta:
        ordering = ["-date_joined"]
        indexes = [models.Index(fields=["college"])]

    def __str__(self):
        return f"{self.full_name or self.username} <{self.email}>"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    @property
    def initials(self):
        parts = (self.full_name or self.email).split()
        return "".join(p[0] for p in parts[:2]).upper() or "?"

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.lower()
        if not self.username and self.email:
            self.username = User.objects.unique_username(self.email)
        # Administrators can always reach the Django admin panel.
        if self.role == self.Role.ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)
