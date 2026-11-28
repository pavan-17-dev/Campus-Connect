from django.urls import path

from . import views

urlpatterns = [
    path("", views.SendMessageView.as_view(), name="message-send"),
    path("conversations/", views.ConversationListView.as_view(), name="conversation-list"),
    path("unread-count/", views.UnreadCountView.as_view(), name="message-unread-count"),
    path("<int:conversation_id>/", views.ConversationMessagesView.as_view(), name="conversation-messages"),
    path("<int:conversation_id>/read/", views.MarkReadView.as_view(), name="conversation-read"),
]
