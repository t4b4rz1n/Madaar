from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from datetime import timedelta
from attendance.models import TimeLog
from attendance.services import TimesheetService
from attendance.tests.base import AttendanceBaseTestCase

class TimesheetTests(AttendanceBaseTestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.employee)
        TimeLog.objects.create(
            user=self.employee, task=self.task,
            start_time=timezone.now() - timedelta(hours=2),
            end_time=timezone.now(),
            duration_seconds=7200, is_active=False
        )

    def test_timesheet_service_get_timesheets(self):
        daily = TimesheetService.get_daily(self.employee, timezone.localdate())
        self.assertEqual(daily['total_seconds'], 7200)

        team_ts = TimesheetService.get_team_timesheet(self.lead, self.org, timezone.localdate(), timezone.localdate())
        self.assertEqual(team_ts.count(), 1)
        self.assertEqual(team_ts.first()['total_seconds'], 7200)

    def test_timesheet_viewset_weekly(self):
        url = reverse("timesheet-weekly")
        res = self.client.get(url, {"week_start": timezone.localdate().isoformat()})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data['results']) > 0)
