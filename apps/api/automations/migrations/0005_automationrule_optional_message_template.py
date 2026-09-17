# Generated manually to make the standard message available when no override is set.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("automations", "0004_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="automationrule",
            name="message_template",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Optional dynamic message template with {{variables}}. Leave blank to use the standard event message.",
            ),
        ),
    ]
