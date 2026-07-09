from django.utils import timezone
from rest_framework import serializers

from billing.models import DiscountCode


class StaffDiscountCodeSerializer(serializers.ModelSerializer):
    is_expired = serializers.SerializerMethodField()
    is_fully_used = serializers.SerializerMethodField()

    class Meta:
        model = DiscountCode
        fields = [
            "id",
            "code",
            "description",
            "percent",
            "max_usage",
            "current_usage",
            "expiration_date",
            "is_active",
            "created_at",
            "is_expired",
            "is_fully_used",
        ]
        read_only_fields = ["id", "current_usage", "created_at"]

    def get_is_expired(self, obj):
        if obj.expiration_date and obj.expiration_date < timezone.now():
            return True
        return False

    def get_is_fully_used(self, obj):
        return obj.current_usage >= obj.max_usage

    def validate_code(self, value):
        return value.upper().strip()

    def validate(self, data):
        expire = data.get("expiration_date")
        if expire and expire < timezone.now():
            raise serializers.ValidationError(
                {"expiration_date": "Expiration date cannot be in the past."}
            )
        return data
