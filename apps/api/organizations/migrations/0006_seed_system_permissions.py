from django.db import migrations

PERMISSIONS_DATA = [
    {"code": "org.view", "name": "View Organization", "module": "core"},
    {"code": "org.manage_settings", "name": "Manage Org Settings", "module": "core"},
    {"code": "org.manage_roles", "name": "Manage Roles & Permissions", "module": "core"},
    {"code": "org.manage_members", "name": "Manage Organization Members", "module": "core"},
    {"code": "user.view", "name": "View Users List", "module": "core"},
    {"code": "role.view", "name": "View Roles List", "module": "core"},
    {"code": "project.view", "name": "View Projects", "module": "projects"},
    {"code": "project.create", "name": "Create New Project", "module": "projects"},
    {"code": "project.manage", "name": "Manage All Projects", "module": "projects"},
    {"code": "task.view", "name": "View Tasks", "module": "tasks"},
    {"code": "task.create", "name": "Create Task", "module": "tasks"},
    {"code": "task.manage_all", "name": "Manage All Tasks", "module": "tasks"},
    {"code": "task.review", "name": "Review & Approve Tasks", "module": "tasks"},
    {"code": "board.view", "name": "View Kanban Boards", "module": "tasks"},
    {"code": "board.manage", "name": "Manage Boards & Columns", "module": "tasks"},
    {"code": "attendance.view", "name": "View Personal Attendance", "module": "attendance"},
    {"code": "attendance.view_all", "name": "View All Member Attendances", "module": "attendance"},
    {"code": "leave.approve", "name": "Approve & Reject Leave Requests", "module": "attendance"},
    {"code": "finance.manage", "name": "Manage Payroll & Financial Records", "module": "billing"},
    {"code": "finance.view_reports", "name": "View Financial Reports", "module": "billing"},
    {"code": "notification.view", "name": "View Notifications", "module": "automations"},
    {"code": "automation.manage", "name": "Manage Automation Rules", "module": "automations"},
    {"code": "report.view", "name": "View Executive & Manager Reports", "module": "reports"},
]

def seed_permissions(apps, schema_editor):
    Permission = apps.get_model("organizations", "Permission")
    for pdata in PERMISSIONS_DATA:
        perm, created = Permission.objects.get_or_create(
            code=pdata["code"],
            defaults={"name": pdata["name"], "module": pdata["module"]},
        )
        if not created and (perm.name != pdata["name"] or perm.module != pdata["module"]):
            perm.name = pdata["name"]
            perm.module = pdata["module"]
            perm.is_deleted = False
            perm.save()

def unseed_permissions(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0005_organizationmembership_dynamic_roles"),
    ]
    operations = [
        migrations.RunPython(seed_permissions, reverse_code=unseed_permissions),
    ]
