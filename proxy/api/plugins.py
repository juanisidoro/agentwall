from __future__ import annotations
from fastapi import APIRouter

router = APIRouter()


@router.get("/plugins")
async def list_plugins() -> list[dict]:
    from db.repositories.plugin_repo import get_all_plugins

    return await get_all_plugins()


@router.get("/plugins/{plugin_id}")
async def get_plugin(plugin_id: str) -> dict:
    from db.repositories.plugin_repo import get_plugin
    from core.errors import NotFoundError

    plugin = await get_plugin(plugin_id)
    if not plugin:
        raise NotFoundError("plugin")
    return plugin
