from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0012_alter_taskstatus_board"),
    ]

    operations = [
        migrations.AlterField(
            model_name="taskactivitylog",
            name="task",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="activity_logs",
                to="tasks.task",
                verbose_name="Task",
            ),
        ),
        migrations.AddField(
            model_name="taskactivitylog",
            name="board",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="activity_logs",
                to="tasks.board",
                verbose_name="Board",
            ),
        ),
    ]
