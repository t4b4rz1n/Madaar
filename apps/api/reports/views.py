"""
reports/views.py
----------------
Read-only APIViews for the reporting & analytics dashboards.

Design decisions
~~~~~~~~~~~~~~~~
* Uses ``APIView`` (not ``ViewSet``) because dashboards are
  **singleton resources** — only ``GET`` is supported.
* Timezone is received via ``tz`` query parameter (default: UTC).
* Manager endpoints accept ``team_id`` for data isolation.
* Executive endpoints accept ``org_id`` for organisation scope.
* All endpoints are documented with ``@extend_schema`` for
  drf-spectacular / Swagger auto-documentation.
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsEmployeeOrAbove, IsExecutive, IsManagerOrAbove
from .serializers import (
    EmployeeDashboardSerializer,
    ExecutiveDashboardSerializer,
    ManagerDashboardSerializer,
    MemberDetailSerializer,
)
from .services import (
    EmployeeDashboardService,
    ExecutiveDashboardService,
    ManagerDashboardService,
)

# ---------------------------------------------------------------------------
# Employee Dashboard
# ---------------------------------------------------------------------------


class EmployeeDashboardView(APIView):
    """Personal dashboard for the authenticated employee.

    Returns today's tasks, overdue tasks, weekly time summary,
    active projects, attendance status, and upcoming milestones.
    """

    permission_classes = [IsAuthenticated, IsEmployeeOrAbove]

    @extend_schema(
        summary="Employee Personal Dashboard",
        description="Returns the authenticated user's personal dashboard data.",
        parameters=[
            OpenApiParameter(
                "tz",
                OpenApiTypes.STR,
                description="User timezone (e.g. Asia/Tehran). Defaults to UTC.",
                required=False,
            ),
        ],
        responses={200: EmployeeDashboardSerializer},
        tags=["reports"],
    )
    def get(self, request):
        tz_name = request.query_params.get("tz", "UTC")
        data = EmployeeDashboardService.get_dashboard(request.user, tz_name)
        serializer = EmployeeDashboardSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Manager Dashboard
# ---------------------------------------------------------------------------


class ManagerDashboardView(APIView):
    """Team-level dashboard for managers and team leads.

    Shows task statistics, work hours, member attendance,
    project summaries, and overdue items for the specified team.
    """

    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    @extend_schema(
        summary="Manager Team Dashboard",
        description=(
            "Returns team-level analytics. If team_id is omitted, "
            "data from all teams the user leads is aggregated."
        ),
        parameters=[
            OpenApiParameter(
                "team_id",
                OpenApiTypes.UUID,
                description="ID of the team to view. Required for team_leads.",
                required=False,
            ),
            OpenApiParameter(
                "tz",
                OpenApiTypes.STR,
                description="User timezone (e.g. Asia/Tehran). Defaults to UTC.",
                required=False,
            ),
        ],
        responses={200: ManagerDashboardSerializer},
        tags=["reports"],
    )
    def get(self, request):
        team_id = request.query_params.get("team_id")
        tz_name = request.query_params.get("tz", "UTC")
        data = ManagerDashboardService.get_dashboard(
            request.user, team_id=team_id, tz_name=tz_name
        )
        serializer = ManagerDashboardSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ManagerMembersView(APIView):
    """Detailed per-member view for managers.

    Shows each team member's task counts, completion rate,
    overdue tasks, and weekly work hours.
    """

    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    @extend_schema(
        summary="Manager Team Members Detail",
        description=("Returns detailed per-member analytics for the specified team."),
        parameters=[
            OpenApiParameter(
                "team_id",
                OpenApiTypes.UUID,
                description="ID of the team to view.",
                required=False,
            ),
            OpenApiParameter(
                "tz",
                OpenApiTypes.STR,
                description="User timezone (e.g. Asia/Tehran). Defaults to UTC.",
                required=False,
            ),
        ],
        responses={200: MemberDetailSerializer(many=True)},
        tags=["reports"],
    )
    def get(self, request):
        team_id = request.query_params.get("team_id")
        tz_name = request.query_params.get("tz", "UTC")
        data = ManagerDashboardService.get_members_detail(
            request.user, team_id=team_id, tz_name=tz_name
        )
        serializer = MemberDetailSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Executive Dashboard
# ---------------------------------------------------------------------------


class ExecutiveDashboardView(APIView):
    """Organisation-wide dashboard for owners and admins.

    Shows company overview, resource utilization, project health,
    and financial summaries across the entire organisation.
    """

    permission_classes = [IsAuthenticated, IsExecutive]

    @extend_schema(
        summary="Executive Organisation Dashboard",
        description=(
            "Returns organisation-wide analytics. If org_id is omitted, "
            "the first organisation the user administers is used."
        ),
        parameters=[
            OpenApiParameter(
                "org_id",
                OpenApiTypes.UUID,
                description="ID of the organisation to view.",
                required=False,
            ),
            OpenApiParameter(
                "tz",
                OpenApiTypes.STR,
                description="User timezone (e.g. Asia/Tehran). Defaults to UTC.",
                required=False,
            ),
        ],
        responses={200: ExecutiveDashboardSerializer},
        tags=["reports"],
    )
    def get(self, request):
        org_id = request.query_params.get("org_id")
        tz_name = request.query_params.get("tz", "UTC")

        data = ExecutiveDashboardService.get_dashboard(
            request.user, org_id=org_id, tz_name=tz_name
        )
        serializer = ExecutiveDashboardSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)
