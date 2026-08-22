from django.db import migrations, models
import django.db.models.deletion


def scope_existing_roles_to_organizations(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    Membership = apps.get_model("organizations", "OrganizationMembership")
    Role = apps.get_model("access_control", "Role")

    legacy_roles = list(Role.objects.filter(organization__isnull=True))
    for organization in Organization.objects.all():
        replacements = {}
        for legacy_role in legacy_roles:
            role = Role.objects.create(
                organization=organization,
                name=legacy_role.name,
                code=legacy_role.code,
                description=legacy_role.description,
                is_active=legacy_role.is_active,
                is_system_role=legacy_role.is_system_role,
            )
            role.permissions.set(legacy_role.permissions.all())
            replacements[legacy_role.pk] = role

        for membership in Membership.objects.filter(organization=organization):
            replacement = replacements.get(membership.role_id)
            if replacement:
                membership.role = replacement
                membership.save(update_fields=["role"])

    Role.objects.filter(organization__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("access_control", "0002_remove_legacy_user_permission"),
        ("organizations", "0004_membership_role_fk_to_access_control"),
    ]

    operations = [
        migrations.AddField(
            model_name="role",
            name="organization",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="roles",
                to="organizations.organization",
            ),
        ),
        migrations.AlterField(
            model_name="role",
            name="code",
            field=models.CharField(db_index=True, max_length=100),
        ),
        migrations.AlterField(
            model_name="role",
            name="name",
            field=models.CharField(max_length=100),
        ),
        migrations.RunPython(scope_existing_roles_to_organizations, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="role",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="roles",
                to="organizations.organization",
            ),
        ),
        migrations.AddConstraint(
            model_name="role",
            constraint=models.UniqueConstraint(
                fields=("organization", "name"),
                name="unique_role_organization_name",
            ),
        ),
        migrations.AddConstraint(
            model_name="role",
            constraint=models.UniqueConstraint(
                fields=("organization", "code"),
                name="unique_role_organization_code",
            ),
        ),
        migrations.DeleteModel(name="UserRole"),
    ]
