from django.conf import settings
from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}


def validate_image_file(file):
    """Reject oversized files and anything that is not a real JPEG/PNG/WEBP image."""
    max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
    if file.size > max_bytes:
        raise ValidationError(f"Image must be {settings.MAX_IMAGE_SIZE_MB} MB or smaller.")
    try:
        position = file.tell() if hasattr(file, "tell") else 0
        image = Image.open(file)
        image.verify()  # detects truncated / fake image files
        image_format = image.format
        file.seek(position)
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise ValidationError("Upload a valid image file (JPG, PNG or WEBP).")
    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise ValidationError("Only JPG, PNG and WEBP images are allowed.")
