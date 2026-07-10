from django.contrib import admin
from .Feedback.models import Feedback
from .Notification.models import Notification
from .Ticketing.models import Attachment, Message, Ticket, TicketType

class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 0

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    inlines = [AttachmentInline]
    list_display = ["ticket", "sender", "seen", "created_at"]
    search_fields = ["text", "sender__username", "ticket__title"]
    list_filter = ["seen", "created_at"]

@admin.register(TicketType)
class TicketTypeAdmin(admin.ModelAdmin):
    list_display = ["name"]
    search_fields = ["name"]

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "status", "created_at"]
    search_fields = ["title", "user__username"]
    list_filter = ["status", "created_at"]

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["user", "text", "seen", "created_at"]
    search_fields = ["text", "user__username"]
    list_filter = ["seen", "created_at"]

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ["user", "subject", "created_at"]
    search_fields = ["user__username", "subject", "text"]
    list_filter = ["created_at"]
