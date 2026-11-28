from django.conf import settings
from django.db import models


class Conversation(models.Model):
    """
    A private thread between exactly two users, optionally about one product.

    Participants are stored in a fixed order (participant_one.id < participant_two.id)
    so the same pair + product always maps to a single conversation.
    """

    participant_one = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    participant_two = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    product = models.ForeignKey(
        "products.Product", on_delete=models.SET_NULL, null=True, blank=True, related_name="conversations"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-last_message_at", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(participant_one__lt=models.F("participant_two")),
                name="conversation_participants_ordered",
            ),
            models.UniqueConstraint(
                fields=["participant_one", "participant_two", "product"],
                condition=models.Q(product__isnull=False),
                name="unique_product_conversation",
            ),
            models.UniqueConstraint(
                fields=["participant_one", "participant_two"],
                condition=models.Q(product__isnull=True),
                name="unique_direct_conversation",
            ),
        ]
        indexes = [
            models.Index(fields=["participant_one", "-last_message_at"]),
            models.Index(fields=["participant_two", "-last_message_at"]),
        ]

    def __str__(self):
        return f"Conversation #{self.pk}"

    def has_participant(self, user):
        return user.id in (self.participant_one_id, self.participant_two_id)

    def other_participant(self, user):
        return self.participant_two if user.id == self.participant_one_id else self.participant_one


class Message(models.Model):
    MAX_LENGTH = 2000

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="messages_sent")
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="messages_received")
    product = models.ForeignKey(
        "products.Product", on_delete=models.SET_NULL, null=True, blank=True, related_name="messages"
    )
    content = models.TextField(max_length=MAX_LENGTH)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)  # message timestamp
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["receiver", "is_read"]),
        ]
        constraints = [
            models.CheckConstraint(condition=~models.Q(sender=models.F("receiver")), name="message_not_to_self"),
        ]

    def __str__(self):
        return f"{self.sender} → {self.receiver}: {self.content[:40]}"
