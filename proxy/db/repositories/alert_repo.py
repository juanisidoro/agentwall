import json
from datetime import datetime, timezone
from db.database import get_db


async def save_alert(alert: dict) -> None:
    db = await get_db()
    await db.execute(
        """INSERT INTO alerts (
               alert_id, timestamp, plugin_id, request_id, severity, message, payload_json
           ) VALUES (
               :alert_id, :timestamp, :plugin_id, :request_id, :severity, :message, :payload_json
           )""",
        {
            "alert_id": alert["alert_id"],
            "timestamp": alert.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "plugin_id": alert.get("plugin_id"),
            "request_id": alert.get("request_id"),
            "severity": alert.get("severity", "info"),
            "message": alert.get("message", ""),
            "payload_json": json.dumps(alert.get("payload", {})),
        },
    )
    await db.commit()


async def get_alerts(
    page: int = 1, limit: int = 50, acknowledged: bool | None = None
) -> list[dict]:
    db = await get_db()
    where_sql = ""
    params: list = []

    if acknowledged is not None:
        where_sql = "WHERE is_acknowledged = ?"
        params.append(1 if acknowledged else 0)

    offset = (page - 1) * limit
    params.extend([limit, offset])

    async with db.execute(
        f"SELECT * FROM alerts {where_sql} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        params,
    ) as cursor:
        rows = await cursor.fetchall()

    return [_deserialize_alert(dict(row)) for row in rows]


async def acknowledge(alert_id: str) -> None:
    db = await get_db()
    await db.execute(
        "UPDATE alerts SET is_acknowledged = 1 WHERE alert_id = ?", (alert_id,)
    )
    await db.commit()


def _deserialize_alert(row: dict) -> dict:
    if "payload_json" in row and row["payload_json"]:
        row["payload"] = json.loads(row["payload_json"])
    else:
        row["payload"] = {}
    row.pop("payload_json", None)
    return row
