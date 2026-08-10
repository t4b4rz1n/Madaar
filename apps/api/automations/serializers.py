from rest_framework import serializers

from .catalog import EVENTS_BY_CODE, RECIPIENT_CODES
from .models import AutomationRule


class AutomationRuleSerializer(serializers.ModelSerializer):
    """Validate that persisted rules stay within the supported event contract."""

    class Meta:
        model = AutomationRule
        fields = [
            'id', 'organization', 'event_type', 'action_type',
            'telegram_group_id', 'message_template', 'recipients',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_event_type(self, value):
        if value not in EVENTS_BY_CODE:
            raise serializers.ValidationError("This event is not supported.")
        return value

    def validate_recipients(self, value):
        if not isinstance(value, list) or not value:
            raise serializers.ValidationError("Choose at least one recipient type.")
        invalid = set(value) - RECIPIENT_CODES
        if invalid:
            raise serializers.ValidationError(
                f"Unsupported recipient types: {', '.join(sorted(invalid))}."
            )
        return list(dict.fromkeys(value))

    def validate(self, attrs):
        organization = attrs.get("organization", getattr(self.instance, "organization", None))
        event_type = attrs.get("event_type", getattr(self.instance, "event_type", None))
        if self.instance and "organization" in attrs and organization != self.instance.organization:
            raise serializers.ValidationError({"organization": "A rule cannot be moved to another organization."})
        if organization and event_type:
            duplicate = AutomationRule.objects.filter(
                organization=organization, event_type=event_type
            )
            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError(
                    {"event_type": "A rule for this organization and event already exists."}
                )
        return attrs

    def create(self, validated_data):
        """Restore a soft-deleted rule instead of violating the legacy DB key."""
        archived_rule = AutomationRule.all_objects.filter(
            organization=validated_data["organization"],
            event_type=validated_data["event_type"],
            action_type=validated_data.get("action_type", AutomationRule.ActionType.TELEGRAM),
            is_deleted=True,
        ).order_by("-updated_at").first()
        if not archived_rule:
            return super().create(validated_data)

        for field, value in validated_data.items():
            setattr(archived_rule, field, value)
        archived_rule.is_deleted = False
        archived_rule.save()
        return archived_rule
