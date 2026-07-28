from django.db import transaction
class AttendanceCascadeService:
    @staticmethod
    @transaction.atomic
    def soft_delete_setting(setting):
        # AttendanceSetting is a leaf node, no children to cascade
        pass
    @staticmethod
    @transaction.atomic
    def restore_setting(setting):
        pass
    @staticmethod
    @transaction.atomic
    def soft_delete_attendance(attendance):
        pass
    @staticmethod
    @transaction.atomic
    def restore_attendance(attendance):
        pass
    @staticmethod
    @transaction.atomic
    def soft_delete_timelog(timelog):
        pass
    @staticmethod
    @transaction.atomic
    def restore_timelog(timelog):
        pass
    @staticmethod
    @transaction.atomic
    def soft_delete_timeoff_request(timeoff_request):
        pass
    @staticmethod
    @transaction.atomic
    def restore_timeoff_request(timeoff_request):
        pass
    @staticmethod
    @transaction.atomic
    def soft_delete_holiday(holiday):
        pass
    @staticmethod
    @transaction.atomic
    def restore_holiday(holiday):
        pass
