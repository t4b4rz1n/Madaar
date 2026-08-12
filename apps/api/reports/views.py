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


class ManagerDashboardView(APIView):
    """Team-level dashboard for managers and team leads.

    Shows task statistics, work hours, member attendance,
    project summaries, and overdue items for the specified team.
    """

    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    @extend_schema(
        summary="Manager Team Dashboard",
        description=(
            "Returns team-level analytics for the specified team.\n\n"
            "**Scope rules (no team_id provided):**\n"
            "- **Owner / Admin**: sees aggregated data for *all* members of every "
            "organisation they administer. Pass team_id to narrow to a specific team.\n"
            "- **Team Lead (non-admin)**: sees only the members of teams they explicitly "
            "lead. Data is empty if they lead no teams.\n\n"
            "Always pass team_id explicitly when querying a specific team."
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


class ExecutiveDashboardView(APIView):
    """Organisation-wide dashboard for owners and admins.

    Shows company overview, resource utilization, project health,
    and financial summaries across the entire organisation.
    """

    permission_classes = [IsAuthenticated, IsExecutive]

    @extend_schema(
        summary="Executive Organisation Dashboard",
        description=(
            "Returns organisation-wide analytics for owners and admins.\n\n"
            "**org_id parameter:**\n"
            "- If provided, returns data for that specific organisation "
            "(user must be owner or admin of it).\n"
            "- If omitted, the oldest membership where the user is owner/admin is used "
            "(deterministic: order by created_at). **For users in multiple organisations, "
            "always pass org_id explicitly to avoid ambiguity.**\n\n"
            "**Week definition:** the reporting week starts on **Saturday** "
            "(Iranian calendar) and ends on Friday.\n\n"
            "**Stub fields:** `points`, `badges`, and `goals` are reserved for future "
            "modules (Gamification Phase 2 and OKR Phase 3) and currently return `null`."
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
