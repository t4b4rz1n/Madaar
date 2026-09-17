from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("tasks", "0011_board_background_color_board_description"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            UPDATE tasks_task SET status_id = (SELECT id FROM tasks_taskstatus WHERE board_id IS NOT NULL LIMIT 1) WHERE status_id IN (SELECT id FROM tasks_taskstatus WHERE board_id IS NULL);
            DELETE FROM tasks_taskstatus WHERE board_id IS NULL;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.AlterField(
            model_name="taskstatus",
            name="board",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="statuses",
                to="tasks.board",
                verbose_name="Board",
            ),
        ),
    ]
