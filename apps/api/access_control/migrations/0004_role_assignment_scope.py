from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("access_control", "0003_organization_scoped_roles"),
    ]

    operations = [
        migrations.AddField(
            model_name="role",
            name="assignment_scope",
            field=models.CharField(
                choices=[
                    ("organization", "Organization"),
                    ("team", "Team"),
                ],
                db_index=True,
                default="organization",
                help_text="Where this role can be assigned.",
                max_length=20,
            ),
        ),
    ]
