from django.urls import path

from . import views

urlpatterns = [
    path("generate-description/", views.GenerateDescriptionView.as_view(), name="ai-generate-description"),
    path("assistant/", views.AssistantView.as_view(), name="ai-assistant"),
]
