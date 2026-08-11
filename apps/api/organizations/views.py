from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from projects.serializers import OrganizationMinimalSerializer

from .models import Organization


class OrganizationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    Provides a read-only list of organizations that the user belongs to.
    Used by front-end components like the Automations page.
    """

    serializer_class = OrganizationMinimalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Organization.objects.all().distinct()

        from .models import OrganizationMembership

        return Organization.objects.filter(
            memberships__user=user,
            memberships__role__in=[
                OrganizationMembership.Role.OWNER,
                OrganizationMembership.Role.ADMIN,
            ],
            memberships__is_deleted=False,
        ).distinct()
