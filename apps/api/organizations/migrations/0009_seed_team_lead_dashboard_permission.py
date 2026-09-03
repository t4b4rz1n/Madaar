from django.db import migrations

def seed_team_lead_permission(apps, schema_editor):
    Permission = apps.get_model("organizations", "Permission")
    Role = apps.get_model("organizations", "Role")

    # 1. Create the permission
    perm, created = Permission.objects.get_or_create(
        code="report.view_team_lead",
        defaults={"name": "View Team Lead Dashboard", "module": "reports"},
    )
    if not created:
        perm.name = "View Team Lead Dashboard"
        perm.module = "reports"
        perm.is_deleted = False
        perm.save()

    # 2. Add to existing Admin, Owner, Team Lead roles
    # The default roles are named "Owner", "Admin", "Team Lead"
    target_roles = ["Owner", "Admin", "Team Lead"]
    roles = Role.objects.filter(name__in=target_roles, is_deleted=False)
    for role in roles:
        role.permissions.add(perm)

def unseed_team_lead_permission(apps, schema_editor):
    Permission = apps.get_model("organizations", "Permission")
    Permission.objects.filter(code="report.view_team_lead").delete()

class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0008_remove_team_unique_team_org_name_and_more"),
    ]
    operations = [
        migrations.RunPython(seed_team_lead_permission, reverse_code=unseed_team_lead_permission),
    ]
