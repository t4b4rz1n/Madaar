from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0003_alter_holiday_date_holiday_unique_holiday_org_date'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='attendance',
            options={
                'ordering': ['-date', '-created_at'],
                'verbose_name': 'Attendance',
                'verbose_name_plural': 'Attendances',
            },
        ),
        migrations.AlterModelOptions(
            name='timelog',
            options={
                'ordering': ['-date', '-start_time'],
                'verbose_name': 'Time Log',
                'verbose_name_plural': 'Time Logs',
            },
        ),
        migrations.AlterModelOptions(
            name='timeoffrequest',
            options={
                'ordering': ['-created_at'],
                'verbose_name': 'Time Off Request',
                'verbose_name_plural': 'Time Off Requests',
            },
        ),
    ]
