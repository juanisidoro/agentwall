import os
import aiosqlite
from pathlib import Path

DB_PATH = os.getenv("AGENTWALL_DB_PATH", str(Path.home() / ".agentwall" / "agentwall.db"))
MIGRATIONS_DIR = Path(__file__).parent / "migrations"

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return _db


async def init_db(db_path: str = DB_PATH) -> aiosqlite.Connection:
    global _db
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    _db = await aiosqlite.connect(db_path)
    _db.row_factory = aiosqlite.Row
    await _db.execute("PRAGMA journal_mode=WAL")
    await _db.execute("PRAGMA foreign_keys=ON")
    await _run_migrations(_db)
    return _db


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None


async def _run_migrations(db: aiosqlite.Connection) -> None:
    await db.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations "
        "(filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))"
    )
    await db.commit()

    async with db.execute("SELECT filename FROM schema_migrations") as cursor:
        applied = {row[0] for row in await cursor.fetchall()}

    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    for migration_file in migration_files:
        if migration_file.name not in applied:
            sql = migration_file.read_text()
            await db.executescript(sql)
            await db.execute(
                "INSERT INTO schema_migrations (filename) VALUES (?)",
                (migration_file.name,),
            )
            await db.commit()
