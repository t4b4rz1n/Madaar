from django.db import migrations


DEFAULT_TICKET_TYPES = [
    "Technical & System Issues",
    "Account & Access",
    "Projects & Tasks",
    "Time & Attendance",
    "Leave & Remote Work",
    "Equipment & Resources",
    "Payroll & Finance",
    "Notifications & Communications",
    "Feedback & Suggestions",
    "Other",
]


def seed_ticket_types(apps, schema_editor):
    ticket_type = apps.get_model("panel", "TicketType")
    for name in DEFAULT_TICKET_TYPES:
        ticket_type.objects.get_or_create(name=name)


class Migration(migrations.Migration):
    dependencies = [("panel", "0001_initial")]

    operations = [migrations.RunPython(seed_ticket_types, migrations.RunPython.noop)]
