from django.contrib.auth import get_user_model
from rest_framework import serializers

from gamification.models import (
    Badge,
    BonusConversionRequest,
    BugBounty,
    Kudos,
    MentorshipSession,
    PointLedger,
    Quest,
    StoreItem,
    StorePurchase,
    UserBadge,
    UserPointBalance,
    UserQuest,
)

User = get_user_model()

class BasicUserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "name", "avatar_url")

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_avatar_url(self, obj):
        if not getattr(obj, "avatar", None):
            return None
        request = self.context.get("request")
        image_url = obj.avatar.url
        return request.build_absolute_uri(image_url) if request else image_url



class UserPointBalanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPointBalance
        fields = ("id", "total_points", "spendable_points", "kudos_budget")


class LeaderboardSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer(read_only=True)

    class Meta:
        model = UserPointBalance
        fields = ("user", "total_points")


class PointLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointLedger
        fields = ("id", "amount", "source", "description", "created_at")


class BadgeSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    class Meta:
        model = Badge
        fields = ("id", "name", "description", "icon", "points_reward", "is_system_managed")

    def get_name(self, obj):
        request = self.context.get("request")
        lang = request.LANGUAGE_CODE if request else "en"
        return obj.name.get(lang, obj.name.get("en")) if isinstance(obj.name, dict) else obj.name

    def get_description(self, obj):
        if not obj.description:
            return None
        request = self.context.get("request")
        lang = request.LANGUAGE_CODE if request else "en"
        return obj.description.get(lang, obj.description.get("en")) if isinstance(obj.description, dict) else obj.description


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)
    awarded_by = BasicUserSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ("id", "badge", "awarded_by", "created_at")


class QuestSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    class Meta:
        model = Quest
        fields = ("id", "title", "description", "points_reward", "is_active")

    def get_title(self, obj):
        request = self.context.get("request")
        lang = request.LANGUAGE_CODE if request else "en"
        return obj.title.get(lang, obj.title.get("en")) if isinstance(obj.title, dict) else obj.title

    def get_description(self, obj):
        if not obj.description:
            return None
        request = self.context.get("request")
        lang = request.LANGUAGE_CODE if request else "en"
        return obj.description.get(lang, obj.description.get("en")) if isinstance(obj.description, dict) else obj.description


class BugBountySerializer(serializers.ModelSerializer):
    reporter = BasicUserSerializer(read_only=True)
    reviewer = BasicUserSerializer(read_only=True)

    class Meta:
        model = BugBounty
        fields = ("id", "reporter", "title", "description", "status", "awarded_points", "reviewer", "created_at")
        read_only_fields = ("status", "awarded_points", "reviewer")


class BadgeAwardSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()


class BugBountyResolveSerializer(serializers.Serializer):
    is_approved = serializers.BooleanField()
    awarded_points = serializers.IntegerField(default=0, min_value=0)


class QuestResolveSerializer(serializers.Serializer):
    is_approved = serializers.BooleanField()


class KudosSerializer(serializers.ModelSerializer):
    sender = BasicUserSerializer(read_only=True)
    receiver = BasicUserSerializer(read_only=True)
    receiver_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Kudos
        fields = ("id", "sender", "receiver", "receiver_id", "amount", "message", "created_at")

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value

class UserQuestSerializer(serializers.ModelSerializer):
    quest = QuestSerializer(read_only=True)
    quest_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = UserQuest
        fields = ("id", "user", "quest", "quest_id", "status", "created_at")
        read_only_fields = ("user", "status")


class MentorshipSessionSerializer(serializers.ModelSerializer):
    mentor = BasicUserSerializer(read_only=True)
    mentee = BasicUserSerializer(read_only=True)
    mentee_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = MentorshipSession
        fields = ("id", "mentor", "mentee", "mentee_id", "description", "duration_hours", "status", "awarded_points", "created_at")
        read_only_fields = ("status", "awarded_points")


class MentorshipResolveSerializer(serializers.Serializer):
    is_approved = serializers.BooleanField()
    awarded_points = serializers.IntegerField(default=0, min_value=0)


class StoreItemSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    class Meta:
        model = StoreItem
        fields = ("id", "name", "description", "cost", "stock", "is_active")

    def get_name(self, obj):
        request = self.context.get("request")
        lang = request.LANGUAGE_CODE if request else "en"
        return obj.name.get(lang, obj.name.get("en")) if isinstance(obj.name, dict) else obj.name

    def get_description(self, obj):
        if not obj.description:
            return None
        request = self.context.get("request")
        lang = request.LANGUAGE_CODE if request else "en"
        return obj.description.get(lang, obj.description.get("en")) if isinstance(obj.description, dict) else obj.description


class StorePurchaseSerializer(serializers.ModelSerializer):
    item = StoreItemSerializer(read_only=True)
    item_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = StorePurchase
        fields = ("id", "user", "item", "item_id", "status", "cost_at_purchase", "created_at")
        read_only_fields = ("user", "status", "cost_at_purchase")


class BonusConversionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = BonusConversionRequest
        fields = ("id", "user", "points_converted", "cash_value", "status", "created_at")
        read_only_fields = ("user", "cash_value", "status")

