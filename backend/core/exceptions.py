"""Consistent JSON error responses for the React frontend.

Every error has the shape:
    {"detail": "<human readable message>", "errors": {<field>: [<messages>]}}
`errors` is only present for validation errors. Unexpected exceptions are logged
and returned as a generic 500 without leaking internals.
"""
import logging

from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def _first_message(data):
    if isinstance(data, list):
        return _first_message(data[0]) if data else None
    if isinstance(data, dict):
        for key, value in data.items():
            msg = _first_message(value)
            if msg:
                return msg if key == "non_field_errors" else f"{msg}"
        return None
    return str(data)


def api_exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        exc = exceptions.ValidationError(detail=exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
    elif isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = exceptions.PermissionDenied()

    response = exception_handler(exc, context)

    if response is None:
        logger.exception("Unhandled API error", exc_info=exc)
        return Response(
            {"detail": "Something went wrong on our side. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, exceptions.ValidationError):
        errors = response.data if isinstance(response.data, dict) else {"non_field_errors": response.data}
        response.data = {"detail": _first_message(errors) or "Invalid input.", "errors": errors}
    elif isinstance(response.data, dict) and "detail" in response.data:
        response.data = {"detail": str(response.data["detail"]), **{k: v for k, v in response.data.items() if k != "detail"}}
    return response
