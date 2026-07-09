from rest_framework import serializers

from .models import Feedback


class StaffFeedbackSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Feedback
        fields = ["id", "user", "subject", "text", "created_at"]
        read_only_fields = ["id", "user", "created_at"]
