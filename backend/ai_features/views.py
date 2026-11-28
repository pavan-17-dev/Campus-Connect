import json
import re

from django.conf import settings
from django.db.models import Q
from drf_spectacular.utils import extend_schema, inline_serializer
from google.genai import types
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Category, Product
from products.serializers import ProductSerializer

from . import gemini
from .prompts import ASSISTANT_SYSTEM_PROMPT, DESCRIPTION_SYSTEM_PROMPT, description_prompt
from .serializers import AssistantSerializer, GeneratedDescriptionSerializer, GenerateDescriptionSerializer
from .throttles import AIBurstThrottle, AIDailyThrottle


@extend_schema(tags=["ai"], request=GenerateDescriptionSerializer, responses={200: GeneratedDescriptionSerializer})
class GenerateDescriptionView(APIView):
    """
    POST /api/ai/generate-description/

    Returns a suggested description only. Nothing is saved: the student reviews and
    edits the text in the Sell form and publishes it themselves.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIBurstThrottle, AIDailyThrottle]

    def post(self, request):
        serializer = GenerateDescriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = gemini.generate(
            description_prompt(serializer.validated_data),
            system_instruction=DESCRIPTION_SYSTEM_PROMPT,
            temperature=0.7,
            max_output_tokens=600,
        )
        return Response(
            {
                "description": text[: Product._meta.get_field("description").max_length],
                "model": settings.GEMINI_MODEL,
                "requires_review": True,
            }
        )


ASSISTANT_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "reply": types.Schema(type=types.Type.STRING),
        "product_ids": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.INTEGER)),
    },
    required=["reply"],
)

STOP_WORDS = {"a", "an", "the", "for", "and", "or", "of", "to", "in", "on", "me", "i", "my", "show", "find", "need",
              "want", "any", "some", "with", "under", "below", "less", "than", "please", "can", "you", "is", "it",
              "rs", "inr", "budget", "within", "looking", "buy", "get", "good", "cheap"}


def candidate_products(message, limit=8):
    """Simple keyword + budget retrieval so Gemini only talks about real listings."""
    text = message.lower()
    budget = None
    match = re.search(r"(?:under|below|less than|within|budget|upto|up to)\s*(?:rs\.?|₹|inr)?\s*(\d[\d,]*)", text)
    if match:
        budget = int(match.group(1).replace(",", ""))

    queryset = Product.objects.visible().available().with_related()
    if budget:
        queryset = queryset.filter(price__lte=budget)

    words = [w for w in re.findall(r"[a-z0-9]+", text) if len(w) > 2 and w not in STOP_WORDS and not w.isdigit()]
    if words:
        query = Q()
        for word in words:
            stem = word[:-1] if word.endswith("s") and len(word) > 4 else word
            query |= Q(title__icontains=stem) | Q(description__icontains=stem) | Q(category__name__icontains=stem) | Q(
                category__slug__icontains=stem
            )
        matched = list(queryset.filter(query)[:limit])
        if matched:
            return matched
    return list(queryset[:limit]) if budget else []


@extend_schema(
    tags=["ai"],
    request=AssistantSerializer,
    responses=inline_serializer(
        "AssistantReply", {"reply": serializers.CharField(), "products": ProductSerializer(many=True)}
    ),
)
class AssistantView(APIView):
    """
    POST /api/ai/assistant/ – the floating "Campus Connect AI Assistant" chat.
    Open to visitors (rate-limited per IP) so anyone can ask how the marketplace works.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AIBurstThrottle, AIDailyThrottle]

    def post(self, request):
        serializer = AssistantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.validated_data["message"]

        candidates = candidate_products(message)
        catalogue = "\n".join(
            f"- id={p.id} | {p.title} | ₹{p.price:.0f} | {p.category.name} | {p.get_condition_display()} | {p.campus}"
            for p in candidates
        ) or "(no matching listings right now)"
        categories = ", ".join(Category.objects.values_list("name", flat=True))
        context_block = f"CATEGORIES: {categories}\nCANDIDATE PRODUCTS:\n{catalogue}"

        contents = [
            types.Content(role="model" if turn["role"] == "assistant" else "user", parts=[types.Part(text=turn["text"])])
            for turn in serializer.validated_data["history"]
            if turn["text"].strip()
        ]
        contents.append(types.Content(role="user", parts=[types.Part(text=f"{context_block}\n\nStudent: {message}")]))

        raw = gemini.generate(
            contents,
            system_instruction=ASSISTANT_SYSTEM_PROMPT,
            temperature=0.5,
            max_output_tokens=500,
            response_schema=ASSISTANT_SCHEMA,
        )
        reply, ids = _parse_assistant(raw)
        by_id = {p.id: p for p in candidates}
        products = [by_id[i] for i in ids if i in by_id][:3]
        return Response(
            {"reply": reply, "products": ProductSerializer(products, many=True, context={"request": request}).data}
        )


def _parse_assistant(raw):
    try:
        data = json.loads(raw)
        reply = str(data.get("reply", "")).strip()
        ids = [int(i) for i in data.get("product_ids", []) if str(i).isdigit()]
        if reply:
            return reply, ids
    except (ValueError, TypeError, AttributeError):
        pass
    return raw.strip(), []  # model returned plain text – still useful
