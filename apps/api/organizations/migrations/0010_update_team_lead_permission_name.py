from django.db import migrations


def update_permission_name(apps, schema_editor):
    Permission = apps.get_model("organizations", "Permission")
    Permission.objects.filter(code="report.view_team_lead").update(name="View Team Overview")


def reverse_permission_name(apps, schema_editor):
    Permission = apps.get_model("organizations", "Permission")
    Permission.objects.filter(code="report.view_team_lead").update(name="View Team Lead Dashboard")


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0009_seed_team_lead_dashboard_permission"),
    ]

    operations = [
        migrations.RunPython(update_permission_name, reverse_code=reverse_permission_name),
    ]
