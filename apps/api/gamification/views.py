from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models
from django.db.models import Sum
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

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
from gamification.permissions import IsAdminOrReadOnly, IsOwnerOrAdmin
from gamification.serializers import (
    BadgeAwardSerializer,
    BadgeSerializer,
    BonusConversionRequestSerializer,
    BugBountyResolveSerializer,
    BugBountySerializer,
    KudosSerializer,
    LeaderboardSerializer,
    MentorshipResolveSerializer,
    MentorshipSessionSerializer,
    PointLedgerSerializer,
    QuestResolveSerializer,
    QuestSerializer,
    StoreItemSerializer,
    StorePurchaseSerializer,
    UserBadgeSerializer,
    UserPointBalanceSerializer,
    UserQuestSerializer,
)
from gamification.services import (
    award_badge,
    get_or_create_balance,
    purchase_store_item,
    request_bonus_conversion,
    request_quest_completion,
    resolve_bonus_conversion,
    resolve_bug_bounty,
    resolve_mentorship_session,
    resolve_quest,
    send_kudos,
    submit_mentorship_session,
)
from organizations.models import Team

User = get_user_model()


class GamificationDashboardViewSet(viewsets.GenericViewSet):
    """User facing endpoints for their own gamification stats."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UserPointBalanceSerializer)
    @action(detail=False, methods=["get"])
    def my_balance(self, request):
        balance = get_or_create_balance(request.user)
        serializer = UserPointBalanceSerializer(balance)
        return Response(serializer.data)

    @extend_schema(responses=UserBadgeSerializer(many=True))
    @action(detail=False, methods=["get"])
    def my_badges(self, request):
        badges = UserBadge.objects.filter(user=request.user, is_deleted=False).select_related("badge", "awarded_by")
        serializer = UserBadgeSerializer(badges, many=True, context={"request": request})
        return Response(serializer.data)

    @extend_schema(responses=PointLedgerSerializer(many=True))
    @action(detail=False, methods=["get"])
    def my_ledger(self, request):
        ledger = PointLedger.objects.filter(user=request.user, is_deleted=False)[:50]
        serializer = PointLedgerSerializer(ledger, many=True, context={"request": request})
        return Response(serializer.data)


class LeaderboardViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """View the company-wide leaderboard."""

    permission_classes = [IsAuthenticated]
    serializer_class = LeaderboardSerializer

    def get_queryset(self):
        return UserPointBalance.objects.filter(is_deleted=False).select_related("user").order_by("-total_points")[:100]


class TeamLeaderboardViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """View the team leaderboard."""

    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        teams = (
            Team.objects.filter(is_deleted=False)
            .annotate(team_points=Sum("memberships__user__point_balance__total_points"))
            .order_by("-team_points")[:50]
        )

        data = [
            {"team_id": t.id, "team_name": t.name, "points": t.team_points or 0}
            for t in teams
        ]
        return Response(data)


class BadgeViewSet(viewsets.ModelViewSet):
    """Manage available badges. Admin can also award badges to users."""

    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = BadgeSerializer
    queryset = Badge.objects.filter(is_deleted=False)

    @extend_schema(request=BadgeAwardSerializer, responses=UserBadgeSerializer)
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdminUser])
    def award(self, request, pk=None):
        """Award this badge to a specific user (admin only)."""
        badge = self.get_object()
        ser = BadgeAwardSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            user = User.objects.get(id=ser.validated_data["user_id"])
        except User.DoesNotExist:
            raise ValidationError({"user_id": "User not found."})

        try:
            user_badge = award_badge(user=user, badge=badge, awarded_by=request.user)
        except DjangoValidationError as e:
            raise ValidationError({"detail": e.messages}) from e

        return Response(
            UserBadgeSerializer(user_badge, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class QuestViewSet(viewsets.ModelViewSet):
    """Manage active quests."""

    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = QuestSerializer

    def get_queryset(self):
        qs = Quest.objects.filter(is_deleted=False)
        if not self.request.user.is_staff:
            qs = qs.filter(is_active=True)
        return qs


class KudosViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Send and view peer appreciation."""

    permission_classes = [IsAuthenticated]
    serializer_class = KudosSerializer

    def get_queryset(self):
        return Kudos.objects.filter(is_deleted=False).select_related("sender", "receiver")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        receiver_id = serializer.validated_data.pop("receiver_id")
        try:
            receiver = User.objects.get(id=receiver_id)
        except User.DoesNotExist as e:
            raise ValidationError({"receiver_id": "User not found."}) from e

        try:
            kudos = send_kudos(
                sender=request.user,
                receiver=receiver,
                amount=serializer.validated_data["amount"],
                message=serializer.validated_data["message"],
            )
        except DjangoValidationError as e:
            raise ValidationError(
                e.message_dict if hasattr(e, "message_dict") else {"detail": e.messages}
            ) from e

        out_serializer = KudosSerializer(kudos, context={"request": request})
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class BugBountyViewSet(viewsets.ModelViewSet):
    """Report bugs and get rewarded (if approved by admin)."""

    permission_classes = [IsAuthenticated]
    serializer_class = BugBountySerializer
    owner_field = "reporter"  # Used by IsOwnerOrAdmin

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        if self.request.user.is_staff:
            return BugBounty.objects.filter(is_deleted=False).select_related("reporter", "reviewer")
        return BugBounty.objects.filter(reporter=self.request.user, is_deleted=False).select_related("reporter", "reviewer")

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)

    @extend_schema(request=BugBountyResolveSerializer, responses=BugBountySerializer)
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdminUser])
    def resolve(self, request, pk=None):
        bounty = self.get_object()
        ser = BugBountyResolveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            bounty = resolve_bug_bounty(
                bounty=bounty,
                is_approved=ser.validated_data["is_approved"],
                reviewer=request.user,
                awarded_points=ser.validated_data["awarded_points"],
            )
        except DjangoValidationError as e:
            raise ValidationError({"detail": e.messages}) from e

        return Response(BugBountySerializer(bounty, context={"request": request}).data)


class UserQuestViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """Request and view completed/pending quests."""

    permission_classes = [IsAuthenticated]
    serializer_class = UserQuestSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return UserQuest.objects.filter(is_deleted=False).select_related("user", "quest")
        return UserQuest.objects.filter(user=self.request.user, is_deleted=False).select_related("user", "quest")

    def perform_create(self, serializer):
        quest_id = serializer.validated_data.pop("quest_id")
        try:
            quest = Quest.objects.get(id=quest_id)
        except Quest.DoesNotExist:
            raise ValidationError({"quest_id": "Quest not found."}) from None

        try:
            request_quest_completion(self.request.user, quest)
        except DjangoValidationError as e:
            raise ValidationError(
                e.message_dict if hasattr(e, "message_dict") else {"detail": e.messages}
            ) from e

    @extend_schema(request=QuestResolveSerializer, responses=UserQuestSerializer)
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdminUser])
    def resolve(self, request, pk=None):
        user_quest = self.get_object()
        ser = QuestResolveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            user_quest = resolve_quest(user_quest, ser.validated_data["is_approved"], request.user)
        except DjangoValidationError as e:
            raise ValidationError({"detail": e.messages}) from e

        return Response(UserQuestSerializer(user_quest, context={"request": request}).data)


class MentorshipSessionViewSet(viewsets.ModelViewSet):
    """Log mentorship sessions for points."""

    permission_classes = [IsAuthenticated]
    serializer_class = MentorshipSessionSerializer
    owner_field = ["mentor", "mentee"]  # Used by IsOwnerOrAdmin

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        if self.request.user.is_staff:
            return MentorshipSession.objects.filter(is_deleted=False).select_related("mentor", "mentee")
        return MentorshipSession.objects.filter(
            models.Q(mentor=self.request.user) | models.Q(mentee=self.request.user),
            is_deleted=False,
        ).select_related("mentor", "mentee")

    def perform_create(self, serializer):
        mentee_id = serializer.validated_data.pop("mentee_id")
        try:
            mentee = User.objects.get(id=mentee_id)
        except User.DoesNotExist:
            raise ValidationError({"mentee_id": "Mentee not found."}) from None

        try:
            submit_mentorship_session(
                mentor=self.request.user,
                mentee=mentee,
                description=serializer.validated_data["description"],
                duration_hours=serializer.validated_data["duration_hours"],
            )
        except DjangoValidationError as e:
            raise ValidationError(
                e.message_dict if hasattr(e, "message_dict") else {"detail": e.messages}
            ) from e

    @extend_schema(request=MentorshipResolveSerializer, responses=MentorshipSessionSerializer)
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdminUser])
    def resolve(self, request, pk=None):
        session = self.get_object()
        ser = MentorshipResolveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            session = resolve_mentorship_session(
                session,
                ser.validated_data["is_approved"],
                request.user,
                ser.validated_data["awarded_points"],
            )
        except DjangoValidationError as e:
            raise ValidationError({"detail": e.messages}) from e

        return Response(MentorshipSessionSerializer(session, context={"request": request}).data)


class StoreItemViewSet(viewsets.ModelViewSet):
    """View and manage store items."""

    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = StoreItemSerializer

    def get_queryset(self):
        qs = StoreItem.objects.filter(is_deleted=False)
        if not self.request.user.is_staff:
            qs = qs.filter(is_active=True, stock__gt=0)
        return qs


class StorePurchaseViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """Purchase items from the store."""

    permission_classes = [IsAuthenticated]
    serializer_class = StorePurchaseSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return StorePurchase.objects.filter(is_deleted=False).select_related("user", "item")
        return StorePurchase.objects.filter(user=self.request.user, is_deleted=False).select_related("user", "item")

    def perform_create(self, serializer):
        item_id = serializer.validated_data.pop("item_id")
        try:
            item = StoreItem.objects.get(id=item_id)
        except StoreItem.DoesNotExist:
            raise ValidationError({"item_id": "Item not found."}) from None

        try:
            purchase_store_item(self.request.user, item)
        except DjangoValidationError as e:
            raise ValidationError(
                e.message_dict if hasattr(e, "message_dict") else {"detail": e.messages}
            ) from e


class BonusConversionViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """Convert points to cash bonuses."""

    permission_classes = [IsAuthenticated]
    serializer_class = BonusConversionRequestSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return BonusConversionRequest.objects.filter(is_deleted=False).select_related("user")
        return BonusConversionRequest.objects.filter(user=self.request.user, is_deleted=False).select_related("user")

    def perform_create(self, serializer):
        try:
            from django.conf import settings

            # Read conversion rate from settings, default to 0.10
            conversion_rate = getattr(settings, "GAMIFICATION_POINT_TO_CASH_RATE", 0.10)
            request_bonus_conversion(
                self.request.user,
                serializer.validated_data["points_converted"],
                conversion_rate,
            )
        except DjangoValidationError as e:
            raise ValidationError(
                e.message_dict if hasattr(e, "message_dict") else {"detail": e.messages}
            ) from e

    @extend_schema(request=BugBountyResolveSerializer, responses=BonusConversionRequestSerializer)
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdminUser])
    def resolve(self, request, pk=None):
        conversion = self.get_object()
        ser = BugBountyResolveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            conversion = resolve_bonus_conversion(conversion, ser.validated_data["is_approved"], request.user)
        except DjangoValidationError as e:
            raise ValidationError({"detail": e.messages}) from e

        return Response(BonusConversionRequestSerializer(conversion, context={"request": request}).data)
