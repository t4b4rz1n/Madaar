from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

DUMMY_ROLES = [
    {
        "id": 1,
        "name": "Super Admin",
        "description": "Full access to everything",
        "permissions": [
            "users.manage",
            "users.view",
            "roles.manage",
            "automations.view",
            "automations.manage",
        ],
        "is_active": True,
        "is_staff": True,
    },
    {
        "id": 2,
        "name": "Support Agent",
        "description": "Can view and manage tickets",
        "permissions": ["tickets.view", "tickets.manage", "users.view"],
        "is_active": True,
        "is_staff": True,
    },
]


class DummyRoleViewSet(viewsets.ViewSet):
    """
    A temporary dummy viewset for roles so the frontend UI can be tested
    without creating database conflicts while another developer is working on User models.
    """

    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response(
            {
                "status": True,
                "message": "Roles fetched successfully",
                "data": {
                    "results": DUMMY_ROLES,
                    "current_page": 1,
                    "has_next": False,
                    "has_previous": False,
                    "next_page": None,
                    "previous_page": None,
                    "result_count": len(DUMMY_ROLES),
                    "total_pages": 1,
                    "total_results": len(DUMMY_ROLES),
                },
            }
        )

    def create(self, request):
        new_id = max([r["id"] for r in DUMMY_ROLES]) + 1
        role = {
            "id": new_id,
            "name": request.data.get("name"),
            "description": request.data.get("description", ""),
            "permissions": request.data.get("permissions", []),
            "is_active": request.data.get("is_active", True),
            "is_staff": request.data.get("is_staff", False),
        }
        DUMMY_ROLES.append(role)
        return Response(
            {"status": True, "message": "Role created successfully", "data": role},
            status=201,
        )

    def retrieve(self, request, pk=None):
        for role in DUMMY_ROLES:
            if str(role["id"]) == pk:
                return Response({"status": True, "data": role})
        return Response({"status": False, "message": "Not found"}, status=404)

    def update(self, request, pk=None):
        for role in DUMMY_ROLES:
            if str(role["id"]) == pk:
                role.update(request.data)
                return Response({"status": True, "data": role, "message": "Role updated"})
        return Response({"status": False, "message": "Not found"}, status=404)

    def destroy(self, request, pk=None):
        global DUMMY_ROLES
        DUMMY_ROLES = [r for r in DUMMY_ROLES if str(r["id"]) != pk]
        return Response({"status": True, "message": "Role deleted"})
