from typing import Optional
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.translation import gettext_lazy as _

from accounts.models import User
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


def get_or_create_balance(user: User) -> UserPointBalance:
    """Helper to ensure a user has a point balance record."""
    balance, _ = UserPointBalance.objects.get_or_create(user=user)
    return balance


@transaction.atomic
def award_points(
    user: User,
    amount: int,
    source: PointLedger.SourceChoices,
    description: Optional[dict] = None,
    related_object_id: Optional[UUID] = None,
) -> PointLedger:
    """
    Safely award (or deduct) points from a user.
    Uses select_for_update to prevent race conditions.
    """
    if amount == 0:
        raise ValidationError(_("Point amount cannot be zero."))

    # Lock the balance row
    balance = UserPointBalance.objects.select_for_update().get(user=user)

    # Check if this is a deduction that would result in negative spendable points
    if amount < 0 and balance.spendable_points + amount < 0:
        raise ValidationError(_("Insufficient spendable points."))

    # Update balance
    if amount > 0:
        balance.total_points += amount
    balance.spendable_points += amount
    balance.save(update_fields=["total_points", "spendable_points", "updated_at"])

    # Create immutable ledger entry
    ledger = PointLedger.objects.create(
        user=user,
        amount=amount,
        source=source,
        description=description,
        related_object_id=related_object_id,
    )
    return ledger


@transaction.atomic
def send_kudos(sender: User, receiver: User, amount: int, message: str) -> Kudos:
    """
    Send peer-to-peer appreciation. Deducts from sender's budget, adds to receiver's points.
    """
    if amount <= 0:
        raise ValidationError(_("Kudos amount must be positive."))
    if sender == receiver:
        raise ValidationError(_("You cannot send kudos to yourself."))

    # Lock sender's balance
    sender_balance = UserPointBalance.objects.select_for_update().get(user=sender)

    if sender_balance.kudos_budget < amount:
        raise ValidationError(_("Insufficient kudos budget."))

    # Deduct budget
    sender_balance.kudos_budget -= amount
    sender_balance.save(update_fields=["kudos_budget", "updated_at"])

    # Create kudos record
    kudos = Kudos.objects.create(
        sender=sender,
        receiver=receiver,
        amount=amount,
        message=message,
    )

    # Award points to receiver
    description = {"en": f"Kudos from {sender.get_full_name()}", "fa": f"تشکر از {sender.get_full_name()}"}
    award_points(
        user=receiver,
        amount=amount,
        source=PointLedger.SourceChoices.KUDOS,
        description=description,
        related_object_id=kudos.id,
    )

    return kudos


@transaction.atomic
def award_badge(user: User, badge: Badge, awarded_by: Optional[User] = None) -> UserBadge:
    """Award a badge to a user and grant associated points if any."""
    if UserBadge.objects.filter(user=user, badge=badge, is_deleted=False).exists():
        raise ValidationError(_("User already has this badge."))

    user_badge = UserBadge.objects.create(user=user, badge=badge, awarded_by=awarded_by)

    if badge.points_reward > 0:
        description = {"en": f"Awarded badge: {badge.name.get('en', 'Badge')}", "fa": f"دریافت مدال: {badge.name.get('fa', 'مدال')}"}
        award_points(
            user=user,
            amount=badge.points_reward,
            source=PointLedger.SourceChoices.SYSTEM,
            description=description,
            related_object_id=user_badge.id,
        )

    return user_badge


@transaction.atomic
def resolve_bug_bounty(bounty: BugBounty, is_approved: bool, reviewer: User, awarded_points: int = 0) -> BugBounty:
    """Approve or reject a bug bounty."""
    if bounty.status != BugBounty.StatusChoices.PENDING:
        raise ValidationError(_("Bounty is not pending."))

    bounty.reviewer = reviewer
    if is_approved:
        if awarded_points <= 0:
            raise ValidationError(_("Approved bug bounties must award positive points."))
        bounty.status = BugBounty.StatusChoices.APPROVED
        bounty.awarded_points = awarded_points

        description = {"en": f"Bug Bounty Approved: {bounty.title}", "fa": f"تایید باگ بانتی: {bounty.title}"}
        award_points(
            user=bounty.reporter,
            amount=awarded_points,
            source=PointLedger.SourceChoices.BUG_BOUNTY,
            description=description,
            related_object_id=bounty.id,
        )
    else:
        bounty.status = BugBounty.StatusChoices.REJECTED
        bounty.awarded_points = 0

    bounty.save(update_fields=["status", "reviewer", "awarded_points", "updated_at"])
    return bounty

def request_quest_completion(user: User, quest: Quest) -> UserQuest:
    if not quest.is_active:
        raise ValidationError(_("Quest is not active."))
    if UserQuest.objects.filter(user=user, quest=quest, is_deleted=False).exclude(status=UserQuest.StatusChoices.REJECTED).exists():
        raise ValidationError(_("Quest already completed or pending."))
    return UserQuest.objects.create(user=user, quest=quest)


@transaction.atomic
def resolve_quest(user_quest: UserQuest, is_approved: bool, reviewer: User) -> UserQuest:
    if user_quest.status != UserQuest.StatusChoices.PENDING:
        raise ValidationError(_("Quest is not pending."))

    user_quest.reviewer = reviewer
    if is_approved:
        user_quest.status = UserQuest.StatusChoices.APPROVED
        points = user_quest.quest.points_reward
        if points > 0:
            quest_name = user_quest.quest.title.get("en", "Quest") if isinstance(user_quest.quest.title, dict) else user_quest.quest.title
            award_points(
                user=user_quest.user,
                amount=points,
                source=PointLedger.SourceChoices.QUEST,
                description={"en": f"Completed Quest: {quest_name}"},
                related_object_id=user_quest.id,
            )
    else:
        user_quest.status = UserQuest.StatusChoices.REJECTED

    user_quest.save(update_fields=["status", "reviewer", "updated_at"])
    return user_quest


def submit_mentorship_session(mentor: User, mentee: User, description: str, duration_hours: float) -> MentorshipSession:
    if mentor == mentee:
        raise ValidationError(_("Mentor and mentee cannot be the same person."))
    if duration_hours <= 0:
        raise ValidationError(_("Duration must be positive."))

    return MentorshipSession.objects.create(
        mentor=mentor, mentee=mentee, description=description, duration_hours=duration_hours
    )


@transaction.atomic
def resolve_mentorship_session(session: MentorshipSession, is_approved: bool, reviewer: User, awarded_points: int = 0) -> MentorshipSession:
    if session.status != MentorshipSession.StatusChoices.PENDING:
        raise ValidationError(_("Session is not pending."))

    session.reviewer = reviewer
    if is_approved:
        if awarded_points <= 0:
            raise ValidationError(_("Approved session must award positive points."))
        session.status = MentorshipSession.StatusChoices.APPROVED
        session.awarded_points = awarded_points
        award_points(
            user=session.mentor,
            amount=awarded_points,
            source=PointLedger.SourceChoices.SYSTEM,
            description={"en": f"Mentorship session with {session.mentee.get_full_name()}"},
            related_object_id=session.id,
        )
    else:
        session.status = MentorshipSession.StatusChoices.REJECTED
        session.awarded_points = 0

    session.save(update_fields=["status", "reviewer", "awarded_points", "updated_at"])
    return session


@transaction.atomic
def purchase_store_item(user: User, item: StoreItem) -> StorePurchase:
    if not item.is_active:
        raise ValidationError(_("Item is not active."))

    # Lock item to check stock
    item = StoreItem.objects.select_for_update().get(id=item.id)
    if item.stock <= 0:
        raise ValidationError(_("Item is out of stock."))

    item.stock -= 1
    item.save(update_fields=["stock", "updated_at"])

    # This will handle the negative points deduction & lock balance
    award_points(
        user=user,
        amount=-item.cost,
        source=PointLedger.SourceChoices.STORE,
        description={"en": f"Purchased: {item.name.get('en', 'Item') if isinstance(item.name, dict) else item.name}"},
    )

    return StorePurchase.objects.create(
        user=user, item=item, cost_at_purchase=item.cost
    )


@transaction.atomic
def request_bonus_conversion(user: User, points_to_convert: int, conversion_rate: float) -> BonusConversionRequest:
    if points_to_convert <= 0:
        raise ValidationError(_("Points must be positive."))

    cash_value = points_to_convert * conversion_rate

    # Deduct points immediately
    award_points(
        user=user,
        amount=-points_to_convert,
        source=PointLedger.SourceChoices.SYSTEM,
        description={"en": f"Converted to bonus: {cash_value}"},
    )

    return BonusConversionRequest.objects.create(
        user=user, points_converted=points_to_convert, cash_value=cash_value
    )


@transaction.atomic
def resolve_bonus_conversion(request: BonusConversionRequest, is_approved: bool, reviewer: User) -> BonusConversionRequest:
    if request.status != BonusConversionRequest.StatusChoices.PENDING:
        raise ValidationError(_("Request is not pending."))

    request.reviewer = reviewer
    if is_approved:
        request.status = BonusConversionRequest.StatusChoices.APPROVED
    else:
        request.status = BonusConversionRequest.StatusChoices.REJECTED
        # Refund points
        award_points(
            user=request.user,
            amount=request.points_converted,
            source=PointLedger.SourceChoices.SYSTEM,
            description={"en": "Bonus conversion rejected refund"},
            related_object_id=request.id,
        )

    request.save(update_fields=["status", "reviewer", "updated_at"])
    return request
