from __future__ import annotations
from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/logs")
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    provider: str | None = Query(None),
    blocked: bool | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
) -> list[dict]:
    from db.repositories.log_repo import get_logs

    filters: dict = {}
    if provider:
        filters["provider"] = provider
    if blocked is not None:
        filters["is_blocked"] = blocked
    if start_date:
        filters["start_date"] = start_date
    if end_date:
        filters["end_date"] = end_date

    return await get_logs(page=page, limit=limit, filters=filters or None)


@router.get("/logs/{request_id}")
async def get_log(request_id: str) -> dict:
    from db.repositories.log_repo import get_log
    from core.errors import NotFoundError

    log = await get_log(request_id)
    if not log:
        raise NotFoundError("log")
    return log
