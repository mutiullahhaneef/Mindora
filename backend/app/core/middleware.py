"""
ASGI Middleware — CORS is handled by FastAPI directly.
This module adds request-level logging middleware.
"""
import logging
import time
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = logging.getLogger("mindora.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs each request: method, path, status code, and response time.
    Attaches a unique X-Request-ID header to every response.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()

        response = await call_next(request)

        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s %d %.1fms [req=%s]",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            request_id,
        )

        response.headers["X-Request-ID"] = request_id
        return response
