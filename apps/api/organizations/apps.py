from django.apps import AppConfig


class OrganizationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "organizations"

    def ready(self):
        from access_control.permissions import set_resolver

        from .permissions.bootstrap import get_organization_resolver

        set_resolver(get_organization_resolver())
        import organizations.signals  # noqa
