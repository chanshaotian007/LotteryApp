from collections import defaultdict, deque
from time import monotonic

from fastapi import HTTPException, Request, status

from app.core.config import get_settings


_hits: dict[str, deque[float]] = defaultdict(deque)


def check_generate_rate_limit(request: Request) -> None:
    limit = get_settings().generate_rate_limit_per_minute
    if limit <= 0:
        return
    client = request.client.host if request.client else "unknown"
    now = monotonic()
    window_start = now - 60.0
    bucket = _hits[client]
    while bucket and bucket[0] < window_start:
        bucket.popleft()
    if len(bucket) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="generate rate limit exceeded",
        )
    bucket.append(now)


def reset_rate_limits() -> None:
    _hits.clear()

