from rest_framework import status
from rest_framework.exceptions import APIException


class AIServiceUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "The AI assistant is unavailable right now. Please try again later or write it yourself."
    default_code = "ai_unavailable"


class AIRateLimited(APIException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = "The AI service is busy right now. Please wait a minute and try again."
    default_code = "ai_rate_limited"


class AITimeout(APIException):
    status_code = status.HTTP_504_GATEWAY_TIMEOUT
    default_detail = "The AI service took too long to respond. Please try again."
    default_code = "ai_timeout"


class AIEmptyResponse(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "The AI could not generate a response for this request. Try rephrasing or adding more details."
    default_code = "ai_empty_response"
