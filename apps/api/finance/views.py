from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.services import FinanceService


def _get_user_org(request):
    """Return (user, organization) for the current request."""
    from organizations.models import OrganizationMembership

    user = request.user
    membership = (
        OrganizationMembership.objects.filter(
            user=user,
            is_active=True,
            is_deleted=False,
        )
        .select_related("organization")
        .first()
    )
    return user, membership.organization if membership else None


class MyFinanceReportView(APIView):
    """GET /api/v1/finance/my-reports/ — personal finance summary."""

    permission_classes = [IsAuthenticated]

    @extend_schema(summary="My finance summary", tags=["finance"])
    def get(self, request):
        user, organization = _get_user_org(request)
        if not organization:
            return Response(
                {"detail": _("You are not a member of any active organization.")},
                status=status.HTTP_404_NOT_FOUND,
            )
        data = FinanceService.get_user_finance_summary(user, organization)
        return Response(data)


class AdminFinanceReportView(APIView):
    """GET /api/v1/finance/admin/reports/ — org-wide finance report (managers only)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Admin finance report", tags=["finance"])
    def get(self, request):
        user, organization = _get_user_org(request)
        if not organization:
            return Response(
                {"detail": _("You are not a member of any active organization.")},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Permission check
        from organizations.services import PermissionService

        if not (
            user.is_staff
            or user.is_superuser
            or PermissionService.has_permission(user, "finance.manage", organization.pk)
            or PermissionService.has_permission(user, "finance.view_reports", organization.pk)
            or PermissionService.has_permission(user, "org.manage_settings", organization.pk)
        ):
            return Response(
                {"detail": _("You do not have permission to view finance reports.")},
                status=status.HTTP_403_FORBIDDEN,
            )

        search = request.query_params.get("search", "").strip()
        data = FinanceService.get_org_finance_report(organization)

        if search:
            q = search.lower()
            data = [
                r
                for r in data
                if q in r["username"].lower()
                or q in r["first_name"].lower()
                or q in r["last_name"].lower()
            ]

        # Simple pagination
        try:
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("page_size", 20))
        except ValueError:
            page, page_size = 1, 20

        total = len(data)
        start = (page - 1) * page_size
        end = start + page_size
        paginated = data[start:end]
        total_pages = max(1, (total + page_size - 1) // page_size)

        return Response(
            {
                "results": paginated,
                "total_results": total,
                "current_page": page,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1,
            }
        )


class ProjectBillingView(APIView):
    """GET /api/v1/finance/projects/{project_id}/billing/ — project cost breakdown."""

    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Project billing breakdown", tags=["finance"])
    def get(self, request, project_id):
        from projects.models import Project

        try:
            project = Project.objects.select_related("organization").get(
                pk=project_id, is_deleted=False
            )
        except Project.DoesNotExist:
            return Response({"detail": _("Project not found.")}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        organization = project.organization

        # Only owners/admins/finance roles can see billing
        from organizations.services import PermissionService

        if not (
            user.is_staff
            or user.is_superuser
            or project.owner_id == user.pk
            or PermissionService.has_permission(user, "finance.manage", organization.pk)
            or PermissionService.has_permission(user, "finance.view_reports", organization.pk)
            or PermissionService.has_permission(user, "org.manage_settings", organization.pk)
        ):
            return Response(
                {"detail": _("You do not have permission to view this project's billing.")},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = FinanceService.get_project_billing(project)
        return Response(data)
