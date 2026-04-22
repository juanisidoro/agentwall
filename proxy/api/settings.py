from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

_proxy_running = False


def set_proxy_running(value: bool) -> None:
    global _proxy_running
    _proxy_running = value


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "proxy_running": _proxy_running}


@router.get("/settings")
async def get_settings() -> dict:
    from db.repositories.config_repo import get_config

    raw = await get_config("__global__")
    return raw or {}


class SettingsUpdate(BaseModel):
    settings: dict


@router.put("/settings")
async def update_settings(body: SettingsUpdate) -> dict:
    from db.repositories.config_repo import set_config

    for key, value in body.settings.items():
        await set_config("__global__", key, str(value))
    return {"status": "ok"}
