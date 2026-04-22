from __future__ import annotations
from fastapi import APIRouter

router = APIRouter()


@router.get("/stats")
async def get_stats() -> dict:
    from db.repositories.log_repo import get_stats, get_provider_counts

    stats = await get_stats()
    stats["by_provider"] = await get_provider_counts()
    return stats
