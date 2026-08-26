import magic
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


def validate_file_magic_bytes(file):
    """
    Validates that a file's actual content (magic bytes) matches an allowed MIME type.
    """
    allowed_mimes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
        "application/x-rar-compressed",
        "text/plain",
        "text/csv",
    ]

    # Read the first 2048 bytes for magic bytes detection
    file.seek(0)
    file_bytes = file.read(2048)
    file.seek(0)

    # Check mime type
    mime = magic.from_buffer(file_bytes, mime=True)
    if mime not in allowed_mimes:
        raise ValidationError(
            _(f"Invalid file type: {mime}. File content does not match allowed types.")
        )
