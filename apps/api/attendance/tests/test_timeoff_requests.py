from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from datetime import timedelta
from attendance.models import TimeOffRequest
from attendance.services import TimeOffRequestService
from attendance.tests.base import AttendanceBaseTestCase

class TimeOffRequestTests(AttendanceBaseTestCase):
    def setUp(self):
        super().setUp()
        self.req = TimeOffRequest.objects.create(
            user=self.employee,
            organization=self.org,
            request_type=TimeOffRequest.Type.VACATION,
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(days=2),
            reason="Vacation"
        )
        self.client.force_authenticate(user=self.employee)

    def test_timeoffrequest_model_creation(self):
        self.assertEqual(self.req.status, TimeOffRequest.Status.PENDING)
        self.assertEqual(str(self.req), f"{self.employee} - {TimeOffRequest.Type.VACATION}")

    def test_timeoffrequest_service_approve(self):
        approved = TimeOffRequestService.approve(self.req.id, self.owner)
        self.assertEqual(approved.status, TimeOffRequest.Status.APPROVED)
        self.assertEqual(approved.approved_by, self.owner)

    def test_timeoffrequest_service_reject(self):
        rejected = TimeOffRequestService.reject(self.req.id, self.admin, "No capacity")
        self.assertEqual(rejected.status, TimeOffRequest.Status.REJECTED)
        self.assertEqual(rejected.manager_note, "No capacity")

    def test_timeoffrequest_service_permission_denied(self):
        with self.assertRaises(PermissionDenied):
            TimeOffRequestService.approve(self.req.id, self.other_employee)

    def test_timeoffrequest_viewset_workflow(self):
        url = reverse("timeoffrequest-list")
        start = timezone.now() + timedelta(days=1)
        end = start + timedelta(days=2)
        
        # Test creation as employee
        res = self.client.post(url, {
            "organization": self.org.id,
            "request_type": "sick",
            "start_datetime": start.isoformat(),
            "end_datetime": end.isoformat(),
            "reason": "Sick leave"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        req_id = res.data["id"]
        
        # Test manager_note is read_only
        res_hack = self.client.post(url, {
            "organization": self.org.id,
            "request_type": "sick",
            "start_datetime": start.isoformat(),
            "end_datetime": end.isoformat(),
            "reason": "Test",
            "manager_note": "Hack attempt"
        })
        self.assertEqual(res_hack.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(res_hack.data.get("manager_note"), "Hack attempt")
        
        # Approve as manager
        self.client.force_authenticate(user=self.manager)
        url_approve = reverse("timeoffrequest-approve", kwargs={"pk": req_id})
        res_approve = self.client.post(url_approve)
        self.assertEqual(res_approve.status_code, status.HTTP_200_OK)
        
        req = TimeOffRequest.objects.get(id=req_id)
        self.assertEqual(req.status, TimeOffRequest.Status.APPROVED)
