# ruff: noqa: F403
from .settings import *

# Override cache backend for tests to use in-memory cache
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-cache",
    }
}
