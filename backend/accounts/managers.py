from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    """Manager for an email-based user model."""

    use_in_migrations = True

    def unique_username(self, email):
        """Derive a free username from the email, e.g. aarav-sharma, aarav-sharma2…"""
        from django.utils.text import slugify

        base = slugify(email.split("@")[0])[:140] or "student"
        username, n = base, 1
        while self.model.objects.filter(username=username).exists():
            n += 1
            username = f"{base}{n}"
        return username

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email).lower()
        if not extra_fields.get("username"):
            extra_fields["username"] = self.unique_username(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # PBKDF2 hashing – never stored in plain text
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", self.model.Role.STUDENT)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", self.model.Role.ADMIN)
        extra_fields.setdefault("full_name", "Administrator")
        if extra_fields.get("is_staff") is not True or extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_staff=True and is_superuser=True.")
        return self._create_user(email, password, **extra_fields)
