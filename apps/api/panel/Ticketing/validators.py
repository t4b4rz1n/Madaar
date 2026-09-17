from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from panel.Ticketing.models import Attachment


def validate_attachment_extension(file):
    extension = Path(file.name).suffix.lower()
    blocked_extensions = {
        ext.lower() if ext.startswith(".") else f".{ext.lower()}"
        for ext in settings.TICKET_ATTACHMENT_BLOCKED_EXTENSIONS
    }
    if extension in blocked_extensions:
        raise serializers.ValidationError(
            f"Files with the {extension} extension are not allowed.",
            code="blocked_attachment_extension",
        )

    try:
        Attachment._meta.get_field("file").run_validators(file)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(exc.messages) from exc
