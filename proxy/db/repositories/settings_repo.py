from db.database import get_db


async def get_all_settings() -> dict:
    db = await get_db()
    async with db.execute("SELECT key, value FROM settings") as cursor:
        rows = await cursor.fetchall()
    return {row["key"]: row["value"] for row in rows}


async def set_setting(key: str, value: str) -> None:
    db = await get_db()
    await db.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, "
        "updated_at = datetime('now')",
        (key, value),
    )
    await db.commit()
