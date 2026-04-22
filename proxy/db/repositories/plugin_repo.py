import json
from datetime import datetime, timezone
from db.database import get_db


async def get_active_plugins_ordered() -> list[dict]:
    db = await get_db()
    async with db.execute(
        "SELECT * FROM plugins WHERE is_active = 1 ORDER BY install_order ASC, installed_at ASC"
    ) as cursor:
        rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def get_plugin(plugin_id: str) -> dict | None:
    db = await get_db()
    async with db.execute("SELECT * FROM plugins WHERE id = ?", (plugin_id,)) as cursor:
        row = await cursor.fetchone()
    return dict(row) if row else None


async def get_all_plugins() -> list[dict]:
    db = await get_db()
    async with db.execute("SELECT * FROM plugins ORDER BY install_order ASC") as cursor:
        rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def upsert_plugin(manifest: dict) -> None:
    db = await get_db()
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        """INSERT INTO plugins (id, name, version, manifest_json, is_active, install_order, installed_at, updated_at)
           VALUES (:id, :name, :version, :manifest_json, 1, :install_order, :now, :now)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             version = excluded.version,
             manifest_json = excluded.manifest_json,
             updated_at = excluded.updated_at""",
        {
            "id": manifest["id"],
            "name": manifest["name"],
            "version": manifest["version"],
            "manifest_json": json.dumps(manifest),
            "install_order": await _next_order(),
            "now": now,
        },
    )
    await db.commit()


async def delete_plugin(plugin_id: str) -> None:
    db = await get_db()
    await db.execute("DELETE FROM plugins WHERE id = ?", (plugin_id,))
    await db.commit()


async def set_active(plugin_id: str, active: bool) -> None:
    db = await get_db()
    await db.execute(
        "UPDATE plugins SET is_active = ?, updated_at = ? WHERE id = ?",
        (1 if active else 0, datetime.now(timezone.utc).isoformat(), plugin_id),
    )
    await db.commit()


async def set_order(plugin_id: str, order: int) -> None:
    db = await get_db()
    await db.execute(
        "UPDATE plugins SET install_order = ?, updated_at = ? WHERE id = ?",
        (order, datetime.now(timezone.utc).isoformat(), plugin_id),
    )
    await db.commit()


async def _next_order() -> int:
    db = await get_db()
    async with db.execute("SELECT COALESCE(MAX(install_order), -1) + 1 FROM plugins") as cursor:
        row = await cursor.fetchone()
    return row[0]
