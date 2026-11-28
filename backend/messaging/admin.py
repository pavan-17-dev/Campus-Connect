from django.contrib import admin

from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ["sender", "receiver", "content", "is_read", "created_at"]
    readonly_fields = ["created_at"]
    autocomplete_fields = ["sender", "receiver"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "participant_one", "participant_two", "product", "last_message_at", "created_at"]
    search_fields = ["participant_one__email", "participant_two__email", "product__title"]
    list_filter = ["created_at"]
    autocomplete_fields = ["participant_one", "participant_two", "product"]
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "sender", "receiver", "short_content", "product", "is_read", "created_at"]
    list_filter = ["is_read", "created_at"]
    search_fields = ["content", "sender__email", "receiver__email", "product__title"]
    autocomplete_fields = ["conversation", "sender", "receiver", "product"]
    date_hierarchy = "created_at"

    @admin.display(description="Message")
    def short_content(self, obj):
        return obj.content[:60] + ("…" if len(obj.content) > 60 else "")
