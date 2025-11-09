from fastapi import Request, status
from fastapi.responses import JSONResponse
from typing import Callable, Dict
from collections import defaultdict
import time
import logging
from ..core.config import settings

logger = logging.getLogger(__name__)

# In-memory rate limiting (simple implementation without Redis)
# NOTE: server/ does not use Redis according to system architecture
_rate_limit_store: Dict[str, list] = defaultdict(list)


class RateLimiter:
    def __init__(self, requests: int = 100, window: int = 3600):
        self.requests = requests
        self.window = window

    def _check_rate_limit(self, key: str) -> Dict:
        """Simple in-memory rate limiting"""
        current_time = time.time()
        window_start = current_time - self.window

        # Clean old entries
        _rate_limit_store[key] = [
            ts for ts in _rate_limit_store[key] if ts > window_start
        ]

        # Add current request
        _rate_limit_store[key].append(current_time)

        current_count = len(_rate_limit_store[key])
        allowed = current_count <= self.requests

        return {
            "allowed": allowed,
            "current_count": current_count,
            "limit": self.requests,
            "remaining": max(0, self.requests - current_count),
            "reset_time": self.window,
        }

    async def __call__(self, request: Request, call_next: Callable):
        # Get client identifier
        client_id = self._get_client_id(request)

        # Check rate limit
        rate_limit_key = f"rate_limit:{client_id}"
        rate_limit_result = self._check_rate_limit(rate_limit_key)

        if not rate_limit_result["allowed"]:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded",
                    "limit": rate_limit_result["limit"],
                    "remaining": rate_limit_result["remaining"],
                    "reset_time": rate_limit_result["reset_time"],
                },
                headers={
                    "X-RateLimit-Limit": str(rate_limit_result["limit"]),
                    "X-RateLimit-Remaining": str(rate_limit_result["remaining"]),
                    "X-RateLimit-Reset": str(rate_limit_result["reset_time"]),
                },
            )

        # Add rate limit headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(rate_limit_result["limit"])
        response.headers["X-RateLimit-Remaining"] = str(rate_limit_result["remaining"])
        response.headers["X-RateLimit-Reset"] = str(rate_limit_result["reset_time"])

        return response

    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier"""
        # Try to get user ID from token first
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            return f"user:{user_id}"

        # Fall back to IP address
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        return f"ip:{client_ip}"


# Rate limiter instance
# NOTE: Chat and AI rate limiters removed - AI features are handled by ai-server/ (Cloud Run)
rate_limiter = RateLimiter(
    requests=settings.RATE_LIMIT_REQUESTS, window=settings.RATE_LIMIT_WINDOW
)
