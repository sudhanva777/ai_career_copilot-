from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

def get_real_address(request):
    if settings.ENVIRONMENT == "development":
        return "127.0.0.1"
    return get_remote_address(request)

limiter = Limiter(
    key_func=get_real_address,
    enabled=settings.ENVIRONMENT == "production"
)
