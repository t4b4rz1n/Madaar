from django.db.models import signals
from django.test import TestCase

from organizations.models import Organization


class SoftDeleteModelTestCase(TestCase):
    def setUp(self):
        self.org1 = Organization.objects.create(name="Org One", slug="org-one")
        self.org2 = Organization.objects.create(name="Org Two", slug="org-two")

    def test_single_instance_soft_delete_and_restore(self):
        old_updated_at = self.org1.updated_at
        self.org1.delete()

        self.assertTrue(self.org1.is_deleted)
        self.assertGreaterEqual(self.org1.updated_at, old_updated_at)
        self.assertEqual(Organization.objects.filter(id=self.org1.id).count(), 0)
        self.assertEqual(Organization.all_objects.filter(id=self.org1.id).count(), 1)
        self.assertEqual(Organization.objects.deleted().filter(id=self.org1.id).count(), 1)

        # Test restore
        self.org1.restore()
        self.assertFalse(self.org1.is_deleted)
        self.assertEqual(Organization.objects.filter(id=self.org1.id).count(), 1)

    def test_queryset_bulk_soft_delete_and_restore(self):
        pre_delete_calls = []
        post_delete_calls = []

        def pre_delete_receiver(sender, instance, **kwargs):
            pre_delete_calls.append(instance.id)

        def post_delete_receiver(sender, instance, **kwargs):
            post_delete_calls.append(instance.id)

        signals.pre_delete.connect(pre_delete_receiver, sender=Organization)
        signals.post_delete.connect(post_delete_receiver, sender=Organization)

        try:
            count, _ = Organization.objects.all().delete()
            self.assertEqual(count, 2)
            self.assertEqual(len(pre_delete_calls), 2)
            self.assertEqual(len(post_delete_calls), 2)
            self.assertEqual(Organization.objects.count(), 0)
            self.assertEqual(Organization.all_objects.count(), 2)
            self.assertEqual(Organization.objects.deleted().count(), 2)

            # Test queryset restore
            count_restored, _ = Organization.objects.deleted().restore()
            self.assertEqual(count_restored, 2)
            self.assertEqual(Organization.objects.count(), 2)
        finally:
            signals.pre_delete.disconnect(pre_delete_receiver, sender=Organization)
            signals.post_delete.disconnect(post_delete_receiver, sender=Organization)
