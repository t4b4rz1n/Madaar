from django.core.management.base import BaseCommand

from access_control.services import seed_default_roles_and_permissions


class Command(BaseCommand):
    help = "Seed default Module 1 system permissions and system roles for organization and team membership."

    def handle(self, *args, **options):
        self.stdout.write("Seeding default roles and permissions for Module 1...")
        seed_default_roles_and_permissions()
        self.stdout.write(self.style.SUCCESS("Successfully seeded default roles and permissions!"))
