from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("access_control", "0001_initial"),
    ]

    operations = [
        migrations.DeleteModel(
            name="UserPermission",
        ),
    ]
