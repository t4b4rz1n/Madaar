"""
FinanceService — core salary logic for Madaar.

Responsibilities:
- set_org_salary(user, organization, payment_type, rate)
- set_project_salary(user, project, payment_type, rate)
- get_effective_salary(user, organization, project=None) → dict
- reset_project_salary(user, project)
- get_user_finance_summary(user, organization) → dict  (for UserFinanceDashboard)
- get_org_finance_report(organization) → list[dict]   (for AdminFinanceDashboard)
- get_project_billing(project) → dict                 (for ProjectBillingTab)
"""

import logging
from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum

logger = logging.getLogger(__name__)


class FinanceService:
    # ------------------------------------------------------------------
    # Salary configuration helpers
    # ------------------------------------------------------------------

    @classmethod
    @transaction.atomic
    def set_org_salary(cls, *, user, organization, payment_type: str, rate) -> "SalaryConfig":
        """Create or update the org-level (default) salary for a user."""
        from finance.models import SalaryConfig

        rate = Decimal(str(rate)) if rate is not None else Decimal("0")

        # Deactivate old configs
        SalaryConfig.objects.filter(
            user=user,
            organization=organization,
            project__isnull=True,
            is_active=True,
            is_deleted=False,
        ).update(is_active=False)

        config = SalaryConfig.objects.create(
            user=user,
            organization=organization,
            project=None,
            payment_type=payment_type or SalaryConfig.PaymentType.MONTHLY,
            rate=rate,
        )
        logger.info("Org salary set for user %s in org %s", user.pk, organization.pk)
        return config

    @classmethod
    @transaction.atomic
    def set_project_salary(cls, *, user, project, payment_type: str | None = None, rate=None) -> "SalaryConfig":
        """Create or update a project-level salary override for a user."""
        from finance.models import SalaryConfig

        rate = Decimal(str(rate)) if rate is not None else None
        organization = project.organization

        # Deactivate old project-level configs for this user/project
        SalaryConfig.objects.filter(
            user=user,
            organization=organization,
            project=project,
            is_active=True,
            is_deleted=False,
        ).update(is_active=False)

        # If no explicit type/rate, fall back to org-level values
        if payment_type is None or rate is None:
            org_config = cls.get_active_org_config(user, organization)
            if org_config:
                payment_type = payment_type or org_config.payment_type
                rate = rate if rate is not None else org_config.rate

        config = SalaryConfig.objects.create(
            user=user,
            organization=organization,
            project=project,
            payment_type=payment_type or SalaryConfig.PaymentType.MONTHLY,
            rate=rate or Decimal("0"),
        )
        logger.info("Project salary set for user %s in project %s", user.pk, project.pk)
        return config

    @classmethod
    def reset_project_salary(cls, *, user, project) -> None:
        """Remove the project-level override so org-level salary takes effect again."""
        from finance.models import SalaryConfig

        SalaryConfig.objects.filter(
            user=user,
            organization=project.organization,
            project=project,
            is_active=True,
            is_deleted=False,
        ).update(is_active=False, is_deleted=True)
        logger.info("Project salary reset for user %s in project %s", user.pk, project.pk)

    @classmethod
    def get_active_org_config(cls, user, organization):
        """Return the active org-level SalaryConfig or None."""
        from finance.models import SalaryConfig

        return (
            SalaryConfig.objects.filter(
                user=user,
                organization=organization,
                project__isnull=True,
                is_active=True,
                is_deleted=False,
            )
            .order_by("-created_at")
            .first()
        )

    @classmethod
    def get_active_project_config(cls, user, organization, project):
        """Return the active project-level SalaryConfig or None."""
        from finance.models import SalaryConfig

        return (
            SalaryConfig.objects.filter(
                user=user,
                organization=organization,
                project=project,
                is_active=True,
                is_deleted=False,
            )
            .order_by("-created_at")
            .first()
        )

    @classmethod
    def get_effective_salary(cls, user, organization, project=None) -> dict:
        """
        Return the effective salary for a user in a given scope.

        Priority: project-level config > org-level config > defaults.
        Returns a dict with keys: type, amount, override, currency.
        """
        if user is None:
            return {"type": None, "amount": None, "override": False, "currency": "IRR"}

        project_config = None
        if project:
            project_config = cls.get_active_project_config(user, organization, project)

        if project_config:
            return {
                "type": project_config.payment_type,
                "amount": project_config.rate,
                "override": True,
                "currency": project_config.currency,
                # also expose flat dict keys for org serializers
                "payment_type": project_config.payment_type,
                "rate": project_config.rate,
            }

        org_config = cls.get_active_org_config(user, organization)
        if org_config:
            return {
                "type": org_config.payment_type,
                "amount": org_config.rate,
                "override": False,
                "currency": org_config.currency,
                "payment_type": org_config.payment_type,
                "rate": org_config.rate,
            }

        return {"type": None, "amount": None, "override": False, "currency": "IRR", "payment_type": None, "rate": None}

    # ------------------------------------------------------------------
    # Finance reporting
    # ------------------------------------------------------------------

    @classmethod
    def get_user_finance_summary(cls, user, organization) -> dict:
        """
        Build the UserFinanceDashboard payload for a given user.
        Aggregates earnings per project (based on hours logged × rate or monthly rate).
        """
        from attendance.models import AttendanceLog
        from projects.models import ProjectMember

        memberships = (
            ProjectMember.objects.filter(
                user=user,
                project__organization=organization,
                is_active=True,
                is_deleted=False,
            )
            .select_related("project__organization")
        )

        projects_data = []
        total_earned = Decimal("0")

        for membership in memberships:
            project = membership.project
            salary = cls.get_effective_salary(user, organization, project)
            payment_type = salary.get("type")
            rate = Decimal(str(salary.get("amount") or 0))
            currency = salary.get("currency", "IRR")

            # Calculate worked hours this month from attendance logs
            total_hours = cls._get_worked_hours(user, project)

            if payment_type == "hourly":
                earned = rate * Decimal(str(total_hours)) if total_hours else Decimal("0")
            elif payment_type == "monthly":
                earned = rate  # flat monthly salary
            else:
                earned = Decimal("0")

            total_earned += earned

            projects_data.append({
                "project_id": str(project.pk),
                "project_name": project.name,
                "payment_type": payment_type,
                "rate": float(rate),
                "total_worked_hours": float(total_hours) if payment_type == "hourly" else None,
                "total_earned": float(earned),
                "total_paid": 0.0,   # payment tracking is a future feature
                "current_balance": float(earned),
                "currency": currency,
                "salary_override": salary.get("override", False),
            })

        return {
            "user_id": str(user.pk),
            "total_income": float(total_earned),
            "total_paid": 0.0,
            "current_balance": float(total_earned),
            "currency": "IRR",
            "projects": projects_data,
        }

    @classmethod
    def _get_worked_hours(cls, user, project) -> Decimal:
        """Return total logged hours for a user in a project (from attendance/time logs)."""
        try:
            from tasks.models import TimeLog
            result = TimeLog.objects.filter(
                user=user,
                task__project=project,
                is_deleted=False,
            ).aggregate(total=Sum("duration_seconds"))
            seconds = result.get("total") or 0
            return Decimal(str(seconds)) / Decimal("3600")
        except Exception:
            return Decimal("0")

    @classmethod
    def get_org_finance_report(cls, organization) -> list:
        """
        Build the AdminFinanceDashboard payload — one entry per user.
        """
        from organizations.models import OrganizationMembership
        from projects.models import ProjectMember

        memberships = OrganizationMembership.objects.filter(
            organization=organization,
            is_active=True,
            is_deleted=False,
        ).select_related("user")

        report = []
        for membership in memberships:
            user = membership.user
            if not user:
                continue

            active_projects = ProjectMember.objects.filter(
                user=user,
                project__organization=organization,
                is_active=True,
                is_deleted=False,
            ).count()

            summary = cls.get_user_finance_summary(user, organization)

            report.append({
                "user_id": str(user.pk),
                "username": user.username,
                "first_name": user.first_name or "",
                "last_name": user.last_name or "",
                "active_projects": active_projects,
                "total_income": summary["total_income"],
                "total_paid": summary["total_paid"],
                "current_balance": summary["current_balance"],
                "currency": summary["currency"],
            })

        return report

    @classmethod
    def get_project_billing(cls, project) -> dict:
        """
        Build the ProjectBillingTab payload — one entry per member, plus totals.
        """
        from projects.models import ProjectMember

        members = ProjectMember.objects.filter(
            project=project,
            is_active=True,
            is_deleted=False,
        ).select_related("user", "project__organization")

        organization = project.organization
        members_data = []
        total_cost = Decimal("0")

        for member in members:
            if not member.user:
                continue
            salary = cls.get_effective_salary(member.user, organization, project)
            payment_type = salary.get("type")
            rate = Decimal(str(salary.get("amount") or 0))
            currency = salary.get("currency", "IRR")

            total_hours = cls._get_worked_hours(member.user, project)

            if payment_type == "hourly":
                cost = rate * Decimal(str(total_hours)) if total_hours else Decimal("0")
            elif payment_type == "monthly":
                cost = rate
            else:
                cost = Decimal("0")

            total_cost += cost

            members_data.append({
                "user_id": str(member.user.pk),
                "username": member.user.username,
                "first_name": member.user.first_name or "",
                "last_name": member.user.last_name or "",
                "specialty": member.specialty or "",
                "allocation_percentage": member.allocation_percentage,
                "payment_type": payment_type,
                "rate": float(rate),
                "currency": currency,
                "salary_override": salary.get("override", False),
                "total_worked_hours": float(total_hours) if payment_type == "hourly" else None,
                "total_cost": float(cost),
            })

        return {
            "project_id": str(project.pk),
            "project_name": project.name,
            "total_cost": float(total_cost),
            "currency": "IRR",
            "members": members_data,
        }
