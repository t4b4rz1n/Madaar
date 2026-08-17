import uuid

from django.db import models, transaction
from django.db.models import signals
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        now = timezone.now()
        instances = list(self)
        if not instances:
            return 0, {self.model._meta.label: 0}

        using = self.db
        with transaction.atomic(using=using):
            for obj in instances:
                signals.pre_delete.send(sender=self.model, instance=obj, using=using)

            count = self.update(is_deleted=True, updated_at=now)

            for obj in instances:
                obj.is_deleted = True
                obj.updated_at = now
                signals.post_delete.send(sender=self.model, instance=obj, using=using)

        return count, {self.model._meta.label: count}

    def restore(self):
        now = timezone.now()
        count = self.update(is_deleted=False, updated_at=now)
        return count, {self.model._meta.label: count}

    def hard_delete(self):
        return super().delete()


class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(is_deleted=False)

    def deleted(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(is_deleted=True)


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def delete(self, using=None, keep_parents=False):
        using = using or "default"
        signals.pre_delete.send(sender=self.__class__, instance=self, using=using)
        self.is_deleted = True
        self.updated_at = timezone.now()
        self.save(update_fields=["is_deleted", "updated_at"])
        signals.post_delete.send(sender=self.__class__, instance=self, using=using)
        return 1, {self._meta.label: 1}

    def restore(self):
        self.is_deleted = False
        self.updated_at = timezone.now()
        self.save(update_fields=["is_deleted", "updated_at"])
        return self

    def hard_delete(self, using=None, keep_parents=False):
        return super().delete(using=using, keep_parents=keep_parents)


