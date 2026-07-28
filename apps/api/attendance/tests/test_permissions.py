from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from attendance.permissions import IsTimeLogOwnerOrAdmin, IsTimeOffRequestPermission, BaseAttendancePermission
from attendance.models import TimeLog, TimeOffRequest
from attendance.tests.base import AttendanceBaseTestCase

class PermissionTests(AttendanceBaseTestCase):
    def setUp(self):
        super().setUp()
        self.factory = RequestFactory()

    def test_timelog_owner_permission(self):
        request = self.factory.get('/')
        request.user = self.employee
        
        timelog = TimeLog.objects.create(user=self.employee, task=self.task, duration_seconds=10, is_active=False)
        
        permission = IsTimeLogOwnerOrAdmin()
        self.assertTrue(permission.has_object_permission(request, None, timelog))
        
        request.user = self.other_employee
        self.assertFalse(permission.has_object_permission(request, None, timelog))
        
        request.user = self.admin
        self.assertTrue(permission.has_object_permission(request, None, timelog))

    def test_timelog_fallback_org(self):
        request = self.factory.get('/')
        request.user = self.admin
        
        # Timelog without project, just task
        timelog = TimeLog.objects.create(user=self.employee, task=self.task, project=None, duration_seconds=10, is_active=False)
        
        permission = IsTimeLogOwnerOrAdmin()
        # Admin should still have permission because it falls back to task.project
        self.assertTrue(permission.has_object_permission(request, None, timelog))

    def test_timeoff_request_permission(self):
        request = self.factory.get('/')
        request.user = self.employee
        
        req = TimeOffRequest.objects.create(user=self.employee, organization=self.org)
        
        permission = IsTimeOffRequestPermission()
        self.assertTrue(permission.has_object_permission(request, None, req))
        
        # Lead should have permission to read/update
        request.user = self.lead
        self.assertTrue(permission.has_object_permission(request, None, req))
        
        # Other employee in different org should not
        request.user = self.other_employee
        self.assertFalse(permission.has_object_permission(request, None, req))
