from django.urls import include, path
from rest_framework.routers import DefaultRouter

from gamification.views import (
    BadgeViewSet,
    BonusConversionViewSet,
    BugBountyViewSet,
    GamificationDashboardViewSet,
    KudosViewSet,
    LeaderboardViewSet,
    MentorshipSessionViewSet,
    QuestViewSet,
    StoreItemViewSet,
    StorePurchaseViewSet,
    TeamLeaderboardViewSet,
    UserQuestViewSet,
)

router = DefaultRouter()
router.register(r"dashboard", GamificationDashboardViewSet, basename="gamification-dashboard")
router.register(r"leaderboard", LeaderboardViewSet, basename="leaderboard")
router.register(r"team-leaderboard", TeamLeaderboardViewSet, basename="team-leaderboard")
router.register(r"badges", BadgeViewSet, basename="badges")
router.register(r"quests", QuestViewSet, basename="quests")
router.register(r"user-quests", UserQuestViewSet, basename="user-quests")
router.register(r"kudos", KudosViewSet, basename="kudos")
router.register(r"bug-bounty", BugBountyViewSet, basename="bug-bounty")
router.register(r"mentorship", MentorshipSessionViewSet, basename="mentorship")
router.register(r"store-items", StoreItemViewSet, basename="store-items")
router.register(r"store-purchases", StorePurchaseViewSet, basename="store-purchases")
router.register(r"bonus-conversion", BonusConversionViewSet, basename="bonus-conversion")

urlpatterns = [
    path("", include(router.urls)),
]
