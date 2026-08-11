from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import DummyRoleViewSet

router = DefaultRouter()
router.register(r'', DummyRoleViewSet, basename='dummy-role')

urlpatterns = [
    path('', include(router.urls)),
]
