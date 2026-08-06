import logging
from django.utils.timezone import now

logger = logging.getLogger(__name__)

class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Log all API requests
        if request.path.startswith('/api/'):
            logger.info(
                f"User: {request.user if request.user.is_authenticated else 'Anonymous'} | "
                f"Method: {request.method} | Path: {request.path} | "
                f"IP: {request.META.get('REMOTE_ADDR')} | Status: {response.status_code}"
            )
        return response