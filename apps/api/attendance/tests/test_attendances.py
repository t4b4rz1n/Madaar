from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from attendance.models import Attendance
from attendance.services import AttendanceService
from attendance.tests.base import AttendanceBaseTestCase

class AttendanceTests(AttendanceBaseTestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.employee)

    def test_attendance_creation(self):
        att = Attendance.objects.create(
            user=self.employee,
            organization=self.org,
            date=timezone.localdate(),
            check_in=timezone.now(),
            is_remote=False
        )
        self.assertEqual(att.user, self.employee)
        self.assertEqual(att.organization, self.org)
        self.assertEqual(att.status, "present")

    def test_attendance_service_check_in_out(self):
        att, created = AttendanceService.check_in(self.employee, self.org)
        self.assertTrue(created)
        self.assertIsNotNone(att.check_in)
        self.assertIsNone(att.check_out)

        # Check out
        att_out = AttendanceService.check_out(self.employee, self.org)
        self.assertIsNotNone(att_out.check_out)

    def test_attendance_viewset_list(self):
        Attendance.objects.create(user=self.employee, organization=self.org, date=timezone.localdate())
        url = reverse("attendance-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results']), 1)

    def test_attendance_viewset_check_in_and_out(self):
        url = reverse("attendance-check-in")
        res = self.client.post(url, {"organization": self.org.id})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        # Calling check_in again should return 200 OK
        res_dup = self.client.post(url, {"organization": self.org.id})
        self.assertEqual(res_dup.status_code, status.HTTP_200_OK)
        
        url_out = reverse("attendance-check-out")
        res_out = self.client.post(url_out)
        self.assertEqual(res_out.status_code, status.HTTP_200_OK)
        
        attendance = Attendance.objects.get(user=self.employee, date=timezone.localdate())
        self.assertIsNotNone(attendance.check_out)
