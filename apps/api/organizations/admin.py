from django.contrib import admin

from .models import Organization, OrganizationMembership, Team, TeamMembership


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "status", "owner", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "slug", "description", "owner__username", "owner__email")
    prepopulated_fields = {"slug": ("name",)}
    raw_id_fields = ("owner",)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "parent_team", "created_at")
    list_filter = ("organization", "parent_team")
    search_fields = ("name", "description", "organization__name")
    raw_id_fields = ("organization", "parent_team")


@admin.register(OrganizationMembership)
class OrganizationMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "organization", "role", "invited_by", "created_at")
    list_filter = ("role", "organization")
    search_fields = ("user__username", "user__email", "organization__name")
    raw_id_fields = ("user", "organization", "invited_by")


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "team", "role", "created_at")
    list_filter = ("role", "team")
    search_fields = ("user__username", "user__email", "team__name")
    raw_id_fields = ("user", "team")
