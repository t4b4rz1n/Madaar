import django.db.models.deletion
from django.db import migrations, models


TEAM_PERMISSION_DEFINITIONS = [
    ("teams.view", "View Team", "organizations", "Teams", "Can view teams and subteams"),
    (
        "team_members.view",
        "View Team Members",
        "organizations",
        "Team Members",
        "Can view members of a team",
    ),
    (
        "team_members.add",
        "Add Team Member",
        "organizations",
        "Team Members",
        "Can add members to a team",
    ),
    (
        "team_members.remove",
        "Remove Team Member",
        "organizations",
        "Team Members",
        "Can remove members from a team",
    ),
    (
        "team_members.change_role",
        "Change Team Member Role",
        "organizations",
        "Team Members",
        "Can change a member role inside a team",
    ),
]


def migrate_team_roles(apps, schema_editor):
    Permission = apps.get_model("access_control", "Permission")
    Role = apps.get_model("access_control", "Role")
    Organization = apps.get_model("organizations", "Organization")
    OrganizationMembership = apps.get_model("organizations", "OrganizationMembership")
    TeamMembership = apps.get_model("organizations", "TeamMembership")

    permissions = {}
    for code, name, module, group, description in TEAM_PERMISSION_DEFINITIONS:
        permission, _created = Permission.objects.update_or_create(
            code=code,
            defaults={
                "name": name,
                "module": module,
                "group": group,
                "description": description,
            },
        )
        permissions[code] = permission

    for organization in Organization.objects.filter(is_deleted=False):
        member_role, _created = Role.objects.get_or_create(
            organization=organization,
            code="member",
            defaults={
                "name": "Member",
                "description": "Team Member Role",
                "assignment_scope": "team",
                "is_active": True,
                "is_system_role": True,
            },
        )
        lead_role, _created = Role.objects.get_or_create(
            organization=organization,
            code="lead",
            defaults={
                "name": "Lead",
                "description": "Team Lead Role",
                "assignment_scope": "team",
                "is_active": True,
                "is_system_role": True,
            },
        )

        for role in (member_role, lead_role):
            role.assignment_scope = "team"
            role.is_active = True
            role.is_system_role = True
            role.save(update_fields=["assignment_scope", "is_active", "is_system_role", "updated_at"])

        member_role.permissions.set([permissions["teams.view"], permissions["team_members.view"]])
        lead_role.permissions.set(
            [
                permissions["teams.view"],
                permissions["team_members.view"],
                permissions["team_members.add"],
                permissions["team_members.remove"],
                permissions["team_members.change_role"],
            ]
        )

        TeamMembership.objects.filter(
            team__organization=organization,
            role__in=["lead", "team_lead"],
        ).update(role_fk=lead_role)
        TeamMembership.objects.filter(
            team__organization=organization,
            role_fk__isnull=True,
        ).update(role_fk=member_role)

        legacy_team_lead = Role.objects.filter(
            organization=organization,
            code="team_lead",
            assignment_scope="organization",
            is_active=True,
        ).first()
        employee_role = Role.objects.filter(
            organization=organization,
            code="employee",
            assignment_scope="organization",
            is_active=True,
        ).first()
        if legacy_team_lead:
            if employee_role:
                OrganizationMembership.objects.filter(
                    organization=organization,
                    role=legacy_team_lead,
                    is_deleted=False,
                ).update(role=employee_role)
            legacy_team_lead.is_active = False
            legacy_team_lead.is_system_role = True
            legacy_team_lead.save(update_fields=["is_active", "is_system_role", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("access_control", "0004_role_assignment_scope"),
        ("organizations", "0005_remove_organizationmembership_invited_by_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="teammembership",
            name="role_fk",
            field=models.ForeignKey(
                blank=True,
                help_text="RBAC Role assigned to this member within this team.",
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="team_memberships",
                to="access_control.role",
            ),
        ),
        migrations.RunPython(migrate_team_roles, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="teammembership",
            name="role",
        ),
        migrations.RenameField(
            model_name="teammembership",
            old_name="role_fk",
            new_name="role",
        ),
        migrations.AlterField(
            model_name="teammembership",
            name="role",
            field=models.ForeignKey(
                help_text="RBAC Role assigned to this member within this team.",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="team_memberships",
                to="access_control.role",
            ),
        ),
    ]
