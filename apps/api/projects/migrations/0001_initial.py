# Generated manually because the local Django and Docker runtimes are unavailable.

import uuid

import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Project",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("organization_id", models.UUIDField(blank=True, db_index=True, null=True, verbose_name="Organization ID")),
                ("owner_id", models.UUIDField(db_index=True, verbose_name="Owner ID")),
                ("name", models.CharField(max_length=255, verbose_name="Name")),
                ("description", models.TextField(blank=True, verbose_name="Description")),
                ("budget", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True, validators=[django.core.validators.MinValueValidator(0)], verbose_name="Budget")),
                ("budget_currency", models.CharField(default="IRR", max_length=3, verbose_name="Budget currency")),
                ("status", models.CharField(choices=[("draft", "Draft"), ("active", "Active"), ("on_hold", "On hold"), ("completed", "Completed"), ("archived", "Archived")], db_index=True, default="draft", max_length=20, verbose_name="Status")),
                ("start_date", models.DateField(blank=True, null=True, verbose_name="Start date")),
                ("deadline", models.DateField(blank=True, null=True, verbose_name="Deadline")),
                ("completed_at", models.DateTimeField(blank=True, null=True, verbose_name="Completed at")),
                ("archived_at", models.DateTimeField(blank=True, null=True, verbose_name="Archived at")),
            ],
            options={"verbose_name": "Project", "verbose_name_plural": "Projects", "ordering": ["-updated_at"]},
        ),
        migrations.CreateModel(
            name="Milestone",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=255, verbose_name="Title")),
                ("description", models.TextField(blank=True, verbose_name="Description")),
                ("status", models.CharField(choices=[("pending", "Pending"), ("in_progress", "In progress"), ("completed", "Completed"), ("cancelled", "Cancelled")], db_index=True, default="pending", max_length=20, verbose_name="Status")),
                ("start_date", models.DateField(blank=True, null=True, verbose_name="Start date")),
                ("target_date", models.DateField(verbose_name="Target date")),
                ("completed_at", models.DateTimeField(blank=True, null=True, verbose_name="Completed at")),
                ("sequence", models.PositiveSmallIntegerField(default=0, verbose_name="Sequence")),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="milestones", to="projects.project", verbose_name="Project")),
            ],
            options={"verbose_name": "Milestone", "verbose_name_plural": "Milestones", "ordering": ["target_date", "sequence"]},
        ),
        migrations.CreateModel(
            name="ProjectMember",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user_id", models.UUIDField(db_index=True, verbose_name="User ID")),
                ("role", models.CharField(choices=[("manager", "Manager"), ("member", "Member"), ("viewer", "Viewer")], default="member", max_length=20, verbose_name="Role")),
                ("specialty", models.CharField(blank=True, max_length=100, verbose_name="Specialty")),
                ("allocation_percentage", models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(100)], verbose_name="Allocation percentage")),
                ("allocation_start_date", models.DateField(blank=True, null=True, verbose_name="Allocation start date")),
                ("allocation_end_date", models.DateField(blank=True, null=True, verbose_name="Allocation end date")),
                ("is_active", models.BooleanField(db_index=True, default=True, verbose_name="Is active")),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="members", to="projects.project", verbose_name="Project")),
            ],
            options={"verbose_name": "Project Member", "verbose_name_plural": "Project Members", "ordering": ["project", "user_id"]},
        ),
        migrations.CreateModel(
            name="ProjectActivity",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("actor_id", models.UUIDField(blank=True, db_index=True, null=True, verbose_name="Actor ID")),
                ("event_type", models.CharField(choices=[("project_created", "Project created"), ("project_updated", "Project updated"), ("member_added", "Member added"), ("member_updated", "Member updated"), ("member_removed", "Member removed"), ("milestone_created", "Milestone created"), ("milestone_updated", "Milestone updated"), ("milestone_completed", "Milestone completed"), ("task_created", "Task created"), ("task_updated", "Task updated"), ("task_completed", "Task completed")], max_length=30, verbose_name="Event type")),
                ("entity_type", models.CharField(choices=[("project", "Project"), ("member", "Member"), ("milestone", "Milestone"), ("task", "Task")], max_length=20, verbose_name="Entity type")),
                ("entity_id", models.UUIDField(blank=True, db_index=True, null=True, verbose_name="Entity ID")),
                ("metadata", models.JSONField(blank=True, default=dict, verbose_name="Metadata")),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="activities", to="projects.project", verbose_name="Project")),
            ],
            options={"verbose_name": "Project Activity", "verbose_name_plural": "Project Activities", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="project", index=models.Index(fields=["organization_id", "status"], name="project_org_status_idx")),
        migrations.AddIndex(model_name="project", index=models.Index(fields=["owner_id", "status"], name="project_owner_status_idx")),
        migrations.AddIndex(model_name="project", index=models.Index(fields=["status", "deadline"], name="project_status_deadline_idx")),
        migrations.AddConstraint(model_name="project", constraint=models.CheckConstraint(condition=models.Q(("deadline__isnull", True), ("start_date__isnull", True), ("deadline__gte", models.F("start_date")), _connector="OR"), name="project_deadline_after_start_date")),
        migrations.AddIndex(model_name="projectmember", index=models.Index(fields=["user_id", "is_active"], name="member_user_active_idx")),
        migrations.AddConstraint(model_name="projectmember", constraint=models.UniqueConstraint(fields=("project", "user_id"), name="unique_project_member")),
        migrations.AddConstraint(model_name="projectmember", constraint=models.CheckConstraint(condition=models.Q(("allocation_end_date__isnull", True), ("allocation_start_date__isnull", True), ("allocation_end_date__gte", models.F("allocation_start_date")), _connector="OR"), name="member_allocation_end_after_start")),
        migrations.AddIndex(model_name="milestone", index=models.Index(fields=["project", "status", "target_date"], name="milestone_proj_status_date_idx")),
        migrations.AddConstraint(model_name="milestone", constraint=models.CheckConstraint(condition=models.Q(("start_date__isnull", True), ("target_date__gte", models.F("start_date")), _connector="OR"), name="milestone_target_after_start")),
        migrations.AddIndex(model_name="projectactivity", index=models.Index(fields=["project", "created_at"], name="activity_project_created_idx")),
        migrations.AddIndex(model_name="projectactivity", index=models.Index(fields=["project", "event_type"], name="activity_project_event_idx")),
    ]
