# ruff: noqa: F403
from .settings import *

# Override cache backend for tests to use in-memory cache
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-cache",
    }
}

# Disable throttling limits for tests
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["login"] = "1000/minute"
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["anon"] = "1000/minute"
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["user"] = "1000/minute"
