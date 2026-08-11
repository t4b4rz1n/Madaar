from django.urls import include, path
from rest_framework.routers import DefaultRouter

from panel.Discount.views import StaffDiscountCodeViewSet
from panel.Ticketing.views import StaffTicketTypeViewSet

discount_code_list = StaffDiscountCodeViewSet.as_view({"get": "list", "post": "create"})

router = DefaultRouter()
router.register(r"ticket-types", StaffTicketTypeViewSet, basename="staff-ticket-type")

urlpatterns = [
    path("", include(router.urls)),
    path("tickets/", include("panel.Ticketing.urls")),
    path("notifications/", include("panel.Notification.urls")),
    path("users/", include("panel.User.urls")),
    path("roles/", include("panel.Role.urls")),
    path("feedbacks/", include("panel.Feedback.urls")),
    path("discounts/", include("panel.Discount.urls")),
    path("discounts", discount_code_list, name="staff-discount-list-no-slash"),
]
