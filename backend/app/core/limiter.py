from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiting is always ON.
# In development, all traffic appears from 127.0.0.1 so the shared
# bucket is unlikely to trip; in production each client IP is distinct.
def get_real_address(request):
    # Respect X-Forwarded-For when behind a reverse proxy
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)

limiter = Limiter(key_func=get_real_address)
