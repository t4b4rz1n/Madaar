from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("panel", "0006_alter_attachment_file")]

    operations = [
        migrations.AddField(
            model_name="notification",
            name="message_data",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
