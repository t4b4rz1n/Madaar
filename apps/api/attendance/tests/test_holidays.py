from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from datetime import timedelta
from django.db import IntegrityError
from attendance.models import Holiday, AttendanceSetting
from attendance.tests.base import AttendanceBaseTestCase

class HolidayTests(AttendanceBaseTestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.employee)

    def test_holiday_unique_constraint(self):
        date = timezone.localdate()
        Holiday.objects.create(name="Holiday 1", date=date, organization=self.org)
        
        with self.assertRaises(IntegrityError):
            Holiday.objects.create(name="Holiday 2", date=date, organization=self.org)
            
        # Different org should work
        Holiday.objects.create(name="Holiday 3", date=date, organization=self.other_org)

    def test_holiday_viewset_list_org_isolation(self):
        Holiday.objects.create(name="Global", date=timezone.localdate())
        Holiday.objects.create(name="Org Holiday", date=timezone.localdate() + timedelta(days=1), organization=self.org)
        Holiday.objects.create(name="Other Holiday", date=timezone.localdate() + timedelta(days=2), organization=self.other_org)

        url = reverse("holiday-list")
        res = self.client.get(url, {"organization": self.org.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # Should only see Global and Org Holiday
        self.assertEqual(len(res.data['results']), 2)
        names = [h["name"] for h in res.data['results']]
        self.assertIn("Global", names)
        self.assertIn("Org Holiday", names)
        self.assertNotIn("Other Holiday", names)

class AttendanceSettingTests(AttendanceBaseTestCase):
    def test_attendance_setting_creation(self):
        setting = AttendanceSetting.objects.create(
            organization=self.org,
            expected_daily_hours=8.0,
            work_days=[0, 1, 2, 3, 4]
        )
        self.assertEqual(setting.expected_daily_hours, 8.0)
