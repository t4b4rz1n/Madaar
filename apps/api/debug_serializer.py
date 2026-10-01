import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User
from organizations.models import Organization, OrganizationMembership, Role
from panel.User.serializers import UserUpdateSerializer

user = User.objects.first()
org = Organization.objects.first()

# Make sure we have a role
role, _ = Role.objects.get_or_create(name="TestRole", organization=org)

class DummyRequest:
    def __init__(self, user):
        self.user = user

request = DummyRequest(user)
serializer = UserUpdateSerializer(user, data={"role_id": str(role.id)}, partial=True, context={'request': request})
if serializer.is_valid():
    serializer.save()
    print("Saved!")
else:
    print("Errors:", serializer.errors)

# Check membership
mem = OrganizationMembership.objects.filter(user=user, organization=org).first()
print("Role ID in DB:", mem.dynamic_roles.first().id if mem and mem.dynamic_roles.first() else None)

from panel.User.serializers import UserListSerializer

res = UserListSerializer(user, context={'request': request}).data
print("Role ID in API Response:", res.get("role_id"))
