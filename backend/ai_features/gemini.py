"""
Thin wrapper around the official Google Gen AI SDK (google-genai).

* The API key comes only from settings.GEMINI_API_KEY (an environment variable)
  and never leaves the server.
* Every SDK / network failure is translated into one of the API exceptions in
  ai_features.exceptions, so views return a helpful JSON error instead of a 500.
"""
import logging
from functools import lru_cache

import httpx
from django.conf import settings
from google import genai
from google.genai import errors, types

from .exceptions import AIEmptyResponse, AIRateLimited, AIServiceUnavailable, AITimeout

logger = logging.getLogger(__name__)


def is_configured():
    return bool(settings.GEMINI_API_KEY)


@lru_cache(maxsize=2)
def _client(api_key, timeout_seconds):
    return genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=timeout_seconds * 1000))


def _config(system_instruction, temperature, max_output_tokens, response_schema):
    kwargs = {
        "system_instruction": system_instruction,
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
    }
    budget = str(settings.GEMINI_THINKING_BUDGET).strip()
    if budget not in ("", "none"):
        kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=int(budget))
    if response_schema is not None:
        kwargs["response_mime_type"] = "application/json"
        kwargs["response_schema"] = response_schema
    return types.GenerateContentConfig(**kwargs)


def generate(contents, *, system_instruction, temperature=0.7, max_output_tokens=800, response_schema=None):
    """Call Gemini and return the response text. Raises ai_features.exceptions.* on failure."""
    if not is_configured():
        raise AIServiceUnavailable("AI features are not configured on the server (GEMINI_API_KEY is missing).")

    client = _client(settings.GEMINI_API_KEY, settings.GEMINI_TIMEOUT_SECONDS)
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=contents,
            config=_config(system_instruction, temperature, max_output_tokens, response_schema),
        )
    except errors.APIError as exc:
        logger.warning("Gemini API error %s: %s", exc.code, getattr(exc, "message", exc))
        if exc.code == 429:
            raise AIRateLimited()
        if exc.code in (408, 504):
            raise AITimeout()
        raise AIServiceUnavailable()
    except httpx.TimeoutException:
        logger.warning("Gemini request timed out after %ss", settings.GEMINI_TIMEOUT_SECONDS)
        raise AITimeout()
    except httpx.HTTPError as exc:
        logger.warning("Gemini network error: %s", exc)
        raise AIServiceUnavailable()

    text = (getattr(response, "text", None) or "").strip()
    if not text:  # e.g. blocked by safety filters
        raise AIEmptyResponse()
    return text
