from rest_framework import serializers

from panel.Feedback.models import Feedback


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ["id", "subject", "text", "created_at"]
        read_only_fields = ["id", "created_at"]
