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


admin.site.register(TicketType)
admin.site.register(Ticket)
admin.site.register(Notification)
admin.site.register(Feedback)
