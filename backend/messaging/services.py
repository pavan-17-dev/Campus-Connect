"""
Messaging rules shared by the REST views. A future WebSocket consumer
(Django Channels) can call the same functions so the rules live in one place.
"""
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Conversation, Message


def _ordered(user_a, user_b):
    return (user_a, user_b) if user_a.id < user_b.id else (user_b, user_a)


def get_or_create_conversation(user, other, product=None):
    if other.id == user.id:
        raise ValidationError({"receiver": ["You cannot message yourself."]})
    if not other.is_active:
        raise ValidationError({"receiver": ["This user is no longer active."]})
    one, two = _ordered(user, other)
    lookup = {"participant_one": one, "participant_two": two, "product": product}
    conversation = Conversation.objects.filter(**lookup).first()
    if conversation:
        return conversation, False
    try:
        with transaction.atomic():
            return Conversation.objects.create(**lookup), True
    except IntegrityError:  # created concurrently by the other participant
        return Conversation.objects.get(**lookup), False


def clean_content(content):
    content = (content or "").strip()
    if not content:
        raise ValidationError({"content": ["Message cannot be empty."]})
    if len(content) > Message.MAX_LENGTH:
        raise ValidationError({"content": [f"Message cannot be longer than {Message.MAX_LENGTH} characters."]})
    return content


def send_message(conversation, sender, content):
    """The sender is always the authenticated user – it is never read from the request body."""
    if not conversation.has_participant(sender):
        raise PermissionDenied("You are not a participant in this conversation.")
    receiver = conversation.other_participant(sender)
    if not receiver.is_active:
        raise ValidationError({"receiver": ["This user is no longer active."]})
    with transaction.atomic():
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            receiver=receiver,
            product_id=conversation.product_id,
            content=clean_content(content),
        )
        Conversation.objects.filter(pk=conversation.pk).update(last_message_at=message.created_at)
    return message


def mark_read(conversation, user):
    return Message.objects.filter(conversation=conversation, receiver=user, is_read=False).update(
        is_read=True, read_at=timezone.now()
    )
