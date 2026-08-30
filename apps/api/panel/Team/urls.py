from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import StaffSquadViewSet, StaffTeamMembershipViewSet, StaffTeamViewSet

router = DefaultRouter()
router.register(r"teams", StaffTeamViewSet, basename="staff-teams")
router.register(r"squads", StaffSquadViewSet, basename="staff-squads")
router.register(r"team-memberships", StaffTeamMembershipViewSet, basename="staff-team-memberships")

urlpatterns = [
    path("", include(router.urls)),
]
