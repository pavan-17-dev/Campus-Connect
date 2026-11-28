from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from accounts.serializers import PublicUserSerializer

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    is_mine = serializers.SerializerMethodField(help_text="True if the current user sent this message")

    class Meta:
        model = Message
        fields = ["id", "conversation", "sender", "receiver", "product", "content", "is_mine", "is_read", "read_at", "created_at"]
        read_only_fields = fields

    def get_is_mine(self, obj) -> bool:
        request = self.context.get("request")
        return bool(request and obj.sender_id == request.user.id)


class ConversationProductSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    price = serializers.DecimalField(max_digits=9, decimal_places=2)
    status = serializers.CharField()
    image = serializers.SerializerMethodField()

    def get_image(self, product) -> str | None:
        first = next(iter(product.images.all()), None)
        if not first:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(first.image.url) if request else first.image.url


class ConversationSerializer(serializers.ModelSerializer):
    participant = serializers.SerializerMethodField(help_text="The other person in the conversation")
    product = ConversationProductSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Conversation
        fields = ["id", "participant", "product", "last_message", "unread_count", "created_at", "last_message_at"]

    @extend_schema_field(PublicUserSerializer)
    def get_participant(self, obj):
        user = self.context["request"].user
        return PublicUserSerializer(obj.other_participant(user), context=self.context).data

    @extend_schema_field(MessageSerializer(allow_null=True))
    def get_last_message(self, obj):
        latest = getattr(obj, "latest_messages", None)
        message = latest[0] if latest else (None if latest is not None else obj.messages.last())
        return MessageSerializer(message, context=self.context).data if message else None


class StartConversationSerializer(serializers.Serializer):
    receiver = serializers.IntegerField(required=False, help_text="User to talk to (defaults to the product's seller)")
    product = serializers.IntegerField(required=False, help_text="Product the conversation is about")

    def validate(self, attrs):
        if not attrs.get("receiver") and not attrs.get("product"):
            raise serializers.ValidationError("Provide a receiver, a product, or both.")
        return attrs


class SendMessageSerializer(StartConversationSerializer):
    content = serializers.CharField(max_length=Message.MAX_LENGTH, allow_blank=True, trim_whitespace=True)


class ConversationMessageSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=Message.MAX_LENGTH, allow_blank=True, trim_whitespace=True)
