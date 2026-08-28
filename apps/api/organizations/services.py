from typing import Union
from django.contrib.auth import get_user_model
from organizations.models import OrganizationMembership

User = get_user_model()

# Compatibility mapping for phase 4 before complete DB migration is guaranteed
COMPATIBILITY_ROLE_PERMISSIONS_MAP = {
    "owner": ["org.manage_settings", "org.manage_roles", "org.manage_members", "project.create", "project.manage", "task.create", "task.manage_all", "task.review", "leave.approve", "attendance.view_all", "finance.manage", "finance.view_reports"],
    "admin": ["org.manage_members", "project.create", "project.manage", "task.create", "task.manage_all", "task.review", "leave.approve", "attendance.view_all", "finance.view_reports"],
    "team_lead": ["project.create", "task.create", "task.manage_all", "task.review", "leave.approve"],
    "hr": ["org.manage_members", "leave.approve", "attendance.view_all"],
    "accountant": ["finance.manage", "finance.view_reports", "attendance.view_all"],
    "employee": ["task.create"]
}

class PermissionService:
    @staticmethod
    def has_permission(user: User, permission_code: str, organization_id: Union[int, str]) -> bool:
        """
        Check if a user has a specific permission within an organization.
        It uses the new dynamic roles if available, and falls back to static role mapping during migration.
        """
        if not user or not user.is_authenticated:
            return False
            
        if user.is_superuser or user.is_staff:
            return True
            
        try:
            membership = OrganizationMembership.objects.prefetch_related('dynamic_roles__permissions').get(
                user=user, 
                organization_id=organization_id
            )
        except OrganizationMembership.DoesNotExist:
            return False
            
        # 1. Check dynamic roles (The New Way)
        if membership.dynamic_roles.filter(permissions__code=permission_code).exists():
            return True
            
        # 2. Compatibility Layer (The Old Way - Fallback)
        # Useful while data migration might not be complete in all environments
        static_role = membership.role
        allowed_perms_for_static_role = COMPATIBILITY_ROLE_PERMISSIONS_MAP.get(static_role, [])
        if permission_code in allowed_perms_for_static_role:
            return True
            
        return False

class AuditService:
    @staticmethod
    def log_action(organization, actor, action, target_user=None, details=None, ip_address=None):
        from .models import OrganizationAuditLog
        return OrganizationAuditLog.objects.create(
            organization=organization,
            actor=actor,
            action=action,
            target_user=target_user,
            details=details or {},
            ip_address=ip_address
        )
