from django.urls import path

from finance.views import AdminFinanceReportView, MyFinanceReportView, ProjectBillingView

urlpatterns = [
    path("my-reports/", MyFinanceReportView.as_view(), name="finance-my-reports"),
    path("admin/reports/", AdminFinanceReportView.as_view(), name="finance-admin-reports"),
    path(
        "projects/<uuid:project_id>/billing/",
        ProjectBillingView.as_view(),
        name="finance-project-billing",
    ),
]
