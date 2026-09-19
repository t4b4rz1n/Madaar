from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class UserPointBalance(BaseModel):
    """Stores the current point balances for a user (Cache/Snapshot)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="point_balance",
        verbose_name=_("User"),
    )
    total_points = models.IntegerField(_("Total Points"), default=0, help_text=_("Lifetime points earned. Used for leaderboards."))
    spendable_points = models.IntegerField(_("Spendable Points"), default=0, help_text=_("Points available to spend in the reward store."))
    kudos_budget = models.IntegerField(_("Kudos Budget"), default=100, help_text=_("Monthly budget to thank peers."))

    class Meta:
        verbose_name = _("User Point Balance")
        verbose_name_plural = _("User Point Balances")

    def __str__(self):
        return f"{self.user.username} - {self.total_points} pts"


class PointLedger(BaseModel):
    """Immutable ledger of all point transactions."""

    class SourceChoices(models.TextChoices):
        SYSTEM = "SYSTEM", _("System")
        KUDOS = "KUDOS", _("Kudos")
        QUEST = "QUEST", _("Quest")
        BUG_BOUNTY = "BUG_BOUNTY", _("Bug Bounty")
        STORE = "STORE", _("Reward Store")
        MANUAL = "MANUAL", _("Manual")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="point_transactions",
        verbose_name=_("User"),
    )
    amount = models.IntegerField(_("Amount"))
    source = models.CharField(_("Source"), max_length=50, choices=SourceChoices.choices)
    description = models.JSONField(_("Description"), blank=True, null=True, help_text=_("Translatable JSON description"))
    related_object_id = models.UUIDField(_("Related Object ID"), blank=True, null=True)

    class Meta:
        verbose_name = _("Point Ledger")
        verbose_name_plural = _("Point Ledgers")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username}: {self.amount} ({self.source})"


class Badge(BaseModel):
    """Defines a badge that can be awarded to users."""

    name = models.JSONField(_("Name"), help_text=_("JSON format for i18n, e.g. {'en': 'Fast Coder', 'fa': 'کدنویس سریع'}"))
    description = models.JSONField(_("Description"), blank=True, null=True)
    icon = models.ImageField(_("Icon"), upload_to="gamification/badges/", blank=True, null=True)
    is_system_managed = models.BooleanField(_("System Managed"), default=True, help_text=_("If true, awarded automatically by system rules."))
    points_reward = models.IntegerField(_("Points Reward"), default=0, help_text=_("Points awarded when this badge is given."))

    class Meta:
        verbose_name = _("Badge")
        verbose_name_plural = _("Badges")

    def __str__(self):
        return str(self.name.get("en", "Badge") if isinstance(self.name, dict) else self.name)


class UserBadge(BaseModel):
    """Mapping of badges awarded to users."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="badges",
        verbose_name=_("User"),
    )
    badge = models.ForeignKey(
        Badge,
        on_delete=models.CASCADE,
        related_name="awarded_to",
        verbose_name=_("Badge"),
    )
    awarded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="awarded_badges",
        verbose_name=_("Awarded By"),
    )

    class Meta:
        verbose_name = _("User Badge")
        verbose_name_plural = _("User Badges")
        constraints = [
            models.UniqueConstraint(fields=["user", "badge"], condition=models.Q(is_deleted=False), name="unique_active_user_badge")
        ]

    def __str__(self):
        return f"{self.user.username} - {self.badge}"


class Quest(BaseModel):
    """Optional quests users can complete for points."""

    title = models.JSONField(_("Title"), help_text=_("JSON format for i18n"))
    description = models.JSONField(_("Description"), blank=True, null=True)
    points_reward = models.IntegerField(_("Points Reward"), default=0)
    is_active = models.BooleanField(_("Is Active"), default=True)

    class Meta:
        verbose_name = _("Quest")
        verbose_name_plural = _("Quests")

    def __str__(self):
        return str(self.title.get("en", "Quest") if isinstance(self.title, dict) else self.title)


class BugBounty(BaseModel):
    """Internal bug reporting for points."""

    class StatusChoices(models.TextChoices):
        PENDING = "PENDING", _("Pending")
        APPROVED = "APPROVED", _("Approved")
        REJECTED = "REJECTED", _("Rejected")

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reported_bugs",
        verbose_name=_("Reporter"),
    )
    title = models.CharField(_("Title"), max_length=255)
    description = models.TextField(_("Description"))
    status = models.CharField(_("Status"), max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    awarded_points = models.IntegerField(_("Awarded Points"), default=0)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="reviewed_bugs",
        verbose_name=_("Reviewer"),
    )

    class Meta:
        verbose_name = _("Bug Bounty")
        verbose_name_plural = _("Bug Bounties")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.status}"


class Kudos(BaseModel):
    """Peer-to-peer appreciation."""

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_kudos",
        verbose_name=_("Sender"),
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_kudos",
        verbose_name=_("Receiver"),
    )
    amount = models.PositiveIntegerField(_("Amount"))
    message = models.TextField(_("Message"))

    class Meta:
        verbose_name = _("Kudos")
        verbose_name_plural = _("Kudos")
        ordering = ["-created_at"]

    def __str__(self):
        return f"From {self.sender.username} to {self.receiver.username}: {self.amount} pts"

class UserQuest(BaseModel):
    class StatusChoices(models.TextChoices):
        PENDING = "PENDING", _("Pending")
        APPROVED = "APPROVED", _("Approved")
        REJECTED = "REJECTED", _("Rejected")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quests",
        verbose_name=_("User"),
    )
    quest = models.ForeignKey(
        Quest,
        on_delete=models.CASCADE,
        related_name="user_quests",
        verbose_name=_("Quest"),
    )
    status = models.CharField(_("Status"), max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="reviewed_quests",
        verbose_name=_("Reviewer"),
    )

    class Meta:
        verbose_name = _("User Quest")
        verbose_name_plural = _("User Quests")
        constraints = [
            models.UniqueConstraint(fields=["user", "quest"], condition=models.Q(is_deleted=False), name="unique_active_user_quest")
        ]

    def __str__(self):
        return f"{self.user.username} - {self.quest}"


class MentorshipSession(BaseModel):
    class StatusChoices(models.TextChoices):
        PENDING = "PENDING", _("Pending")
        APPROVED = "APPROVED", _("Approved")
        REJECTED = "REJECTED", _("Rejected")

    mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mentor_sessions",
        verbose_name=_("Mentor"),
    )
    mentee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mentee_sessions",
        verbose_name=_("Mentee"),
    )
    description = models.TextField(_("Description"))
    duration_hours = models.DecimalField(_("Duration (Hours)"), max_digits=5, decimal_places=2)
    status = models.CharField(_("Status"), max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    awarded_points = models.IntegerField(_("Awarded Points"), default=0)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="reviewed_mentorships",
        verbose_name=_("Reviewer"),
    )

    class Meta:
        verbose_name = _("Mentorship Session")
        verbose_name_plural = _("Mentorship Sessions")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.mentor.username} taught {self.mentee.username}"


class StoreItem(BaseModel):
    name = models.JSONField(_("Name"), help_text=_("JSON format for i18n"))
    description = models.JSONField(_("Description"), blank=True, null=True)
    cost = models.IntegerField(_("Cost"), help_text=_("Cost in spendable points"))
    stock = models.IntegerField(_("Stock"), default=0)
    is_active = models.BooleanField(_("Is Active"), default=True)

    class Meta:
        verbose_name = _("Store Item")
        verbose_name_plural = _("Store Items")

    def __str__(self):
        return str(self.name.get("en", "Store Item") if isinstance(self.name, dict) else self.name)


class StorePurchase(BaseModel):
    class StatusChoices(models.TextChoices):
        PENDING = "PENDING", _("Pending Fulfillment")
        FULFILLED = "FULFILLED", _("Fulfilled")
        CANCELLED = "CANCELLED", _("Cancelled")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="purchases",
        verbose_name=_("User"),
    )
    item = models.ForeignKey(
        StoreItem,
        on_delete=models.CASCADE,
        related_name="purchases",
        verbose_name=_("Item"),
    )
    status = models.CharField(_("Status"), max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    cost_at_purchase = models.IntegerField(_("Cost at Purchase"))

    class Meta:
        verbose_name = _("Store Purchase")
        verbose_name_plural = _("Store Purchases")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} bought {self.item}"


class BonusConversionRequest(BaseModel):
    class StatusChoices(models.TextChoices):
        PENDING = "PENDING", _("Pending")
        APPROVED = "APPROVED", _("Approved/Paid")
        REJECTED = "REJECTED", _("Rejected")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bonus_requests",
        verbose_name=_("User"),
    )
    points_converted = models.IntegerField(_("Points Converted"))
    cash_value = models.DecimalField(_("Cash Value"), max_digits=10, decimal_places=2)
    status = models.CharField(_("Status"), max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="reviewed_bonuses",
        verbose_name=_("Reviewer"),
    )

    class Meta:
        verbose_name = _("Bonus Conversion")
        verbose_name_plural = _("Bonus Conversions")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username}: {self.points_converted} pts to cash"
