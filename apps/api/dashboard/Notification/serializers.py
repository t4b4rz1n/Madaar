from rest_framework import serializers

from panel.Notification.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "text", "link", "seen", "created_at"]
        read_only_fields = ["id", "text", "link", "created_at"]
