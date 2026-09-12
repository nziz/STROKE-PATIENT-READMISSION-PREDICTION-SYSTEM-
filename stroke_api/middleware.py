import logging
from django.contrib.sessions.backends.db import SessionStore
from django.utils.timezone import now

logger = logging.getLogger(__name__)


class TabSessionMiddleware:
    """Load the Django session selected by the current browser tab."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        session_key = request.headers.get('X-Tab-Session')
        if session_key:
            request.session = SessionStore(session_key=session_key)
        return self.get_response(request)

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