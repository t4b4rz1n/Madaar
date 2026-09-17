from rest_framework import serializers


class BroadcastNotificationSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=255, required=True, allow_blank=False)
    link = serializers.URLField(max_length=255, required=False, allow_blank=True, allow_null=True)

    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError("Text cannot be empty.")
        return value
