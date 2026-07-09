from django.urls import include, path

from panel.Discount.views import StaffDiscountCodeViewSet

discount_code_list = StaffDiscountCodeViewSet.as_view({"get": "list", "post": "create"})

urlpatterns = [
    path("tickets/", include("panel.Ticketing.urls")),
    path("notifications/", include("panel.Notification.urls")),
    path("users/", include("panel.User.urls")),
    path("feedbacks/", include("panel.Feedback.urls")),
    path("discounts/", include("panel.Discount.urls")),  
    path("discounts", discount_code_list, name="staff-discount-list-no-slash"),
]
