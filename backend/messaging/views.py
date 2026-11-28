from django.contrib.auth import get_user_model
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from products.models import Product, ProductImage

from . import services
from .models import Conversation, Message
from .serializers import (
    ConversationMessageSerializer,
    ConversationSerializer,
    MessageSerializer,
    SendMessageSerializer,
    StartConversationSerializer,
)

User = get_user_model()


def conversations_for(user):
    """Only conversations the user takes part in – the core privacy rule."""
    return (
        Conversation.objects.filter(Q(participant_one=user) | Q(participant_two=user))
        .select_related("participant_one", "participant_two", "product")
        .prefetch_related(
            Prefetch("product__images", queryset=ProductImage.objects.order_by("uploaded_at")),
            Prefetch("messages", queryset=Message.objects.order_by("-created_at", "-id")[:1], to_attr="latest_messages"),
        )
        .annotate(unread_count=Count("messages", filter=Q(messages__receiver=user, messages__is_read=False)))
    )


def _resolve_target(user, data):
    """Work out who the user wants to talk to, and about which product."""
    product = None
    if data.get("product"):
        product = get_object_or_404(Product.objects.visible(), pk=data["product"])
    if data.get("receiver"):
        receiver = get_object_or_404(User, pk=data["receiver"], is_active=True)
    else:
        receiver = product.seller
    if product and user.id != product.seller_id and receiver.id != product.seller_id:
        # Product conversations are always between the seller and one other student.
        raise serializers.ValidationError({"receiver": ["Messages about a product must be sent to its seller."]})
    return receiver, product


class SendThrottleMixin:
    def get_throttles(self):
        if self.request.method == "POST":
            self.throttle_scope = "messages"
            return [ScopedRateThrottle()]
        return super().get_throttles()


@extend_schema(tags=["messages"])
class ConversationListView(SendThrottleMixin, generics.ListCreateAPIView):
    """
    GET  /api/messages/conversations/  – my conversations, newest activity first
    POST /api/messages/conversations/  – start (or reopen) a conversation {receiver?, product?}
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversationSerializer
    filter_backends = []

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Conversation.objects.none()
        return conversations_for(self.request.user)

    @extend_schema(request=StartConversationSerializer, responses={200: ConversationSerializer, 201: ConversationSerializer})
    def post(self, request):
        serializer = StartConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        receiver, product = _resolve_target(request.user, serializer.validated_data)
        conversation, created = services.get_or_create_conversation(request.user, receiver, product)
        conversation = self.get_queryset().get(pk=conversation.pk)
        return Response(
            self.get_serializer(conversation).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


SentResponse = inline_serializer(
    "SentMessage", {"conversation": ConversationSerializer(), "message": MessageSerializer()}
)


@extend_schema(tags=["messages"])
class SendMessageView(SendThrottleMixin, APIView):
    """POST /api/messages/ – send a message to a user (and product); creates the conversation if needed."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(operation_id="messages_send", request=SendMessageSerializer, responses={201: SentResponse})
    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.clean_content(serializer.validated_data["content"])  # validate before creating a conversation
        receiver, product = _resolve_target(request.user, serializer.validated_data)
        conversation, _ = services.get_or_create_conversation(request.user, receiver, product)
        message = services.send_message(conversation, request.user, serializer.validated_data["content"])
        conversation = conversations_for(request.user).get(pk=conversation.pk)
        context = {"request": request}
        return Response(
            {
                "conversation": ConversationSerializer(conversation, context=context).data,
                "message": MessageSerializer(message, context=context).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["messages"])
class ConversationMessagesView(SendThrottleMixin, APIView):
    """
    GET  /api/messages/<conversation_id>/?after=<message id>&limit=100 – messages, oldest first.
         `after` lets the frontend poll for new messages (ready to swap for WebSockets).
    POST /api/messages/<conversation_id>/ {content} – reply in this conversation.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_conversation(self):
        # Non-participants get 404, so private conversations are not even revealed to exist.
        return get_object_or_404(conversations_for(self.request.user), pk=self.kwargs["conversation_id"])

    @extend_schema(
        parameters=[OpenApiParameter("after", int), OpenApiParameter("limit", int)],
        responses=inline_serializer(
            "ConversationMessages", {"conversation": ConversationSerializer(), "messages": MessageSerializer(many=True)}
        ),
    )
    def get(self, request, conversation_id):
        conversation = self.get_conversation()
        messages = conversation.messages.all()
        after = request.query_params.get("after")
        if after and after.isdigit():
            messages = messages.filter(id__gt=int(after))
        try:
            limit = max(1, min(int(request.query_params.get("limit", 100)), 500))
        except ValueError:
            limit = 100
        # newest `limit` messages, returned oldest → newest for display
        messages = list(messages.order_by("-created_at", "-id")[:limit])[::-1]
        context = {"request": request}
        return Response(
            {
                "conversation": ConversationSerializer(conversation, context=context).data,
                "messages": MessageSerializer(messages, many=True, context=context).data,
            }
        )

    @extend_schema(operation_id="messages_reply", request=ConversationMessageSerializer, responses={201: MessageSerializer})
    def post(self, request, conversation_id):
        conversation = self.get_conversation()
        serializer = ConversationMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = services.send_message(conversation, request.user, serializer.validated_data["content"])
        return Response(MessageSerializer(message, context={"request": request}).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["messages"], request=None, responses=inline_serializer("MarkedRead", {"marked_read": serializers.IntegerField()}))
class MarkReadView(APIView):
    """POST /api/messages/<conversation_id>/read/ – mark messages I received in this conversation as read."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id):
        conversation = get_object_or_404(conversations_for(request.user), pk=conversation_id)
        return Response({"marked_read": services.mark_read(conversation, request.user)})


@extend_schema(tags=["messages"], responses=inline_serializer("UnreadCount", {"unread": serializers.IntegerField()}))
class UnreadCountView(APIView):
    """GET /api/messages/unread-count/ – badge count for the navbar."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"unread": Message.objects.filter(receiver=request.user, is_read=False).count()})
