from django.contrib import admin

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


@admin.register(UserPointBalance)
class UserPointBalanceAdmin(admin.ModelAdmin):
    list_display = ("user", "total_points", "spendable_points", "kudos_budget", "updated_at")
    search_fields = ("user__username", "user__email")
    readonly_fields = ("total_points", "spendable_points", "updated_at")


@admin.register(PointLedger)
class PointLedgerAdmin(admin.ModelAdmin):
    list_display = ("user", "amount", "source", "created_at")
    list_filter = ("source",)
    search_fields = ("user__username",)
    readonly_fields = ("user", "amount", "source", "description", "related_object_id", "created_at")

    def has_add_permission(self, request):
        return False  # immutable — no manual creation

    def has_change_permission(self, request, obj=None):
        return False  # immutable


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ("__str__", "is_system_managed", "points_reward")
    list_filter = ("is_system_managed",)
    search_fields = ("name",)


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ("user", "badge", "awarded_by", "created_at")
    search_fields = ("user__username", "badge__name")
    autocomplete_fields = ("user", "badge")


@admin.register(Quest)
class QuestAdmin(admin.ModelAdmin):
    list_display = ("__str__", "points_reward", "is_active")
    list_filter = ("is_active",)


@admin.register(UserQuest)
class UserQuestAdmin(admin.ModelAdmin):
    list_display = ("user", "quest", "status", "reviewer", "created_at")
    list_filter = ("status",)
    search_fields = ("user__username",)


@admin.register(BugBounty)
class BugBountyAdmin(admin.ModelAdmin):
    list_display = ("title", "reporter", "status", "awarded_points", "reviewer", "created_at")
    list_filter = ("status",)
    search_fields = ("title", "reporter__username")
    readonly_fields = ("reporter", "created_at")


@admin.register(Kudos)
class KudosAdmin(admin.ModelAdmin):
    list_display = ("sender", "receiver", "amount", "created_at")
    search_fields = ("sender__username", "receiver__username")
    readonly_fields = ("sender", "receiver", "amount", "message", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(MentorshipSession)
class MentorshipSessionAdmin(admin.ModelAdmin):
    list_display = ("mentor", "mentee", "duration_hours", "status", "awarded_points", "created_at")
    list_filter = ("status",)
    search_fields = ("mentor__username", "mentee__username")


@admin.register(StoreItem)
class StoreItemAdmin(admin.ModelAdmin):
    list_display = ("__str__", "cost", "stock", "is_active")
    list_filter = ("is_active",)


@admin.register(StorePurchase)
class StorePurchaseAdmin(admin.ModelAdmin):
    list_display = ("user", "item", "cost_at_purchase", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("user__username",)


@admin.register(BonusConversionRequest)
class BonusConversionRequestAdmin(admin.ModelAdmin):
    list_display = ("user", "points_converted", "cash_value", "status", "reviewer", "created_at")
    list_filter = ("status",)
    search_fields = ("user__username",)
