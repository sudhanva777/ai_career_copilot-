from slowapi import Limiter
from slowapi.util import get_remote_address
import re

# Rate limiting is always ON.
# In development, all traffic appears from 127.0.0.1 so the shared
# bucket is unlikely to trip; in production each client IP is distinct.

# Basic IP address pattern to prevent header injection attacks
_IP_PATTERN = re.compile(r"^[\d\.]+$|^[\da-fA-F:]+$")


def get_real_address(request):
    # Respect X-Forwarded-For when behind a reverse proxy
    # Take only the first (leftmost) IP to prevent spoofing via appended values
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        candidate = forwarded.split(",")[0].strip()
        # Validate it looks like an IP address before trusting it
        if candidate and _IP_PATTERN.match(candidate):
            return candidate
    return get_remote_address(request)

limiter = Limiter(key_func=get_real_address)
