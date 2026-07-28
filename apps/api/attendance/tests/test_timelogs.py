from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from datetime import timedelta
from attendance.models import TimeLog
from attendance.services import TimeLogService
from attendance.tests.base import AttendanceBaseTestCase

class TimeLogTests(AttendanceBaseTestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.employee)

    def test_timelog_duration(self):
        start = timezone.now()
        end = start + timedelta(hours=2)
        log = TimeLog.objects.create(
            user=self.employee,
            task=self.task,
            start_time=start,
            end_time=end,
            duration_seconds=7200,
            is_active=False
        )
        self.assertEqual(str(log), f"{self.employee} - {self.task}")
        self.assertEqual(log.duration_seconds, 7200)

    def test_timelog_service_start_stop(self):
        timer = TimeLogService.start_timer(self.employee, self.task)
        self.assertTrue(timer.is_active)
        self.assertEqual(timer.user, self.employee)
        
        active = TimeLogService.get_active_timer(self.employee)
        self.assertEqual(active.id, timer.id)

        stopped = TimeLogService.stop_timer(self.employee, timer.id)
        self.assertFalse(stopped.is_active)
        self.assertIsNotNone(stopped.end_time)
        self.assertTrue(stopped.duration_seconds >= 0)

    def test_timelog_service_cancel(self):
        timer = TimeLogService.start_timer(self.employee, self.task)
        canceled = TimeLogService.cancel_timer(self.employee, timer.id)
        self.assertFalse(canceled.is_active)
        self.assertTrue(canceled.is_deleted)

    def test_timelog_viewset_create_is_active(self):
        url = reverse("timelog-list")
        start = timezone.now()
        end = start + timedelta(hours=1)
        
        res = self.client.post(url, {
            "task": self.task.id,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "is_active": True
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["is_active"])

    def test_timelog_viewset_start_stop(self):
        url_start = reverse("timelog-start-timer")
        res_start = self.client.post(url_start, {"task": self.task.id})
        self.assertEqual(res_start.status_code, status.HTTP_200_OK)
        timer_id = res_start.data["id"]
        
        url_stop = reverse("timelog-stop-timer", kwargs={"pk": timer_id})
        res_stop = self.client.post(url_stop)
        self.assertEqual(res_stop.status_code, status.HTTP_200_OK)
        
        timer = TimeLog.objects.get(id=timer_id)
        self.assertFalse(timer.is_active)
        self.assertIsNotNone(timer.end_time)
