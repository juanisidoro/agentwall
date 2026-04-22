from __future__ import annotations
from db.database import get_db


class PluginStorage:
    """Key-value store scoped to a single plugin_id. Backed by SQLite plugin_storage table."""

    def __init__(self, plugin_id: str) -> None:
        self._plugin_id = plugin_id

    async def get(self, key: str) -> str | None:
        db = await get_db()
        async with db.execute(
            "SELECT value FROM plugin_storage WHERE plugin_id = ? AND key = ?",
            (self._plugin_id, key),
        ) as cursor:
            row = await cursor.fetchone()
        return row["value"] if row else None

    async def set(self, key: str, value: str) -> None:
        db = await get_db()
        await db.execute(
            """INSERT INTO plugin_storage (plugin_id, key, value)
               VALUES (?, ?, ?)
               ON CONFLICT(plugin_id, key) DO UPDATE SET value = excluded.value""",
            (self._plugin_id, key, value),
        )
        await db.commit()

    async def delete(self, key: str) -> None:
        db = await get_db()
        await db.execute(
            "DELETE FROM plugin_storage WHERE plugin_id = ? AND key = ?",
            (self._plugin_id, key),
        )
        await db.commit()

    async def keys(self) -> list[str]:
        db = await get_db()
        async with db.execute(
            "SELECT key FROM plugin_storage WHERE plugin_id = ?", (self._plugin_id,)
        ) as cursor:
            rows = await cursor.fetchall()
        return [row["key"] for row in rows]

    async def clear(self) -> None:
        db = await get_db()
        await db.execute(
            "DELETE FROM plugin_storage WHERE plugin_id = ?", (self._plugin_id,)
        )
        await db.commit()
