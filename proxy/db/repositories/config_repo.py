from db.database import get_db


async def get_config(plugin_id: str) -> dict:
    db = await get_db()
    async with db.execute(
        "SELECT key, value FROM plugin_configs WHERE plugin_id = ?", (plugin_id,)
    ) as cursor:
        rows = await cursor.fetchall()
    return {row["key"]: row["value"] for row in rows}


async def set_config(plugin_id: str, key: str, value: str) -> None:
    db = await get_db()
    await db.execute(
        """INSERT INTO plugin_configs (plugin_id, key, value)
           VALUES (?, ?, ?)
           ON CONFLICT(plugin_id, key) DO UPDATE SET value = excluded.value""",
        (plugin_id, key, value),
    )
    await db.commit()


async def delete_config(plugin_id: str) -> None:
    db = await get_db()
    await db.execute("DELETE FROM plugin_configs WHERE plugin_id = ?", (plugin_id,))
    await db.commit()
