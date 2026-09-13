from django.db import migrations

def delete_roles(apps, schema_editor):
    Role = apps.get_model('organizations', 'Role')
    # Delete roles with exact names 'HR' and 'Designer'
    # 'Hr' will not be deleted because case-sensitive matching is default or we can explicitly use __in
    Role.objects.filter(name__in=['HR', 'Designer']).delete()

def reverse_delete_roles(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0013_organizationmembership_salary_amount_and_more'),
    ]

    operations = [
        migrations.RunPython(delete_roles, reverse_code=reverse_delete_roles),
    ]
