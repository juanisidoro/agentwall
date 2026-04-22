from __future__ import annotations
from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/alerts")
async def get_alerts(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    acknowledged: bool | None = Query(None),
) -> list[dict]:
    from db.repositories.alert_repo import get_alerts

    return await get_alerts(page=page, limit=limit, acknowledged=acknowledged)


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str) -> dict:
    from db.repositories.alert_repo import acknowledge

    await acknowledge(alert_id)
    return {"status": "ok"}
