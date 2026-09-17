import logging

from django.conf import settings
from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Centralized API exception handler.
    Intercepts exceptions raised in DRF views, formats them into a clean JSON Response
    so that ApiRenderer can wrap them, and logs 500 errors and database constraints.
    """
    # Call REST framework's default exception handler first to handle standard DRF exceptions
    response = exception_handler(exc, context)

    if response is None:
        # Handle Database Integrity Errors (e.g., duplicate unique constraint, foreign key violation)
        if isinstance(exc, IntegrityError):
            logger.warning(f"IntegrityError: {str(exc)}", exc_info=True)
            data = {"detail": "Database constraint violation or conflict."}
            return Response(data, status=status.HTTP_409_CONFLICT)

        # Handle all other unhandled server exceptions (500 errors)
        logger.error(f"Unhandled Exception occurred in request: {str(exc)}", exc_info=True)

        # Include detailed error in DEBUG mode for development DX
        if settings.DEBUG:
            data = {"detail": f"Internal Server Error: {str(exc)}"}
        else:
            data = {"detail": "A server error occurred. Please contact support."}

        return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # For standard DRF exceptions, the response object is returned and will go
    # to the ApiRenderer to format standard {status, message, data, errors}.
    return response
