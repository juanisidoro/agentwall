import json
from datetime import datetime, timezone
from db.database import get_db


async def save_request_log(log: dict) -> None:
    db = await get_db()
    await db.execute(
        """INSERT INTO request_log (
               request_id, timestamp, agent_id, provider, model,
               destination, method, status_code, input_tokens, output_tokens,
               latency_ms, is_blocked, block_reason, plugin_results_json
           ) VALUES (
               :request_id, :timestamp, :agent_id, :provider, :model,
               :destination, :method, :status_code, :input_tokens, :output_tokens,
               :latency_ms, :is_blocked, :block_reason, :plugin_results_json
           )""",
        {
            "request_id": log["request_id"],
            "timestamp": log.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "agent_id": log.get("agent_id"),
            "provider": log.get("provider"),
            "model": log.get("model"),
            "destination": log.get("destination"),
            "method": log.get("method"),
            "status_code": log.get("status_code"),
            "input_tokens": log.get("input_tokens"),
            "output_tokens": log.get("output_tokens"),
            "latency_ms": log.get("latency_ms"),
            "is_blocked": 1 if log.get("is_blocked") else 0,
            "block_reason": log.get("block_reason"),
            "plugin_results_json": json.dumps(log.get("plugin_results", [])),
        },
    )
    await db.commit()


async def get_logs(page: int = 1, limit: int = 50, filters: dict | None = None) -> list[dict]:
    db = await get_db()
    where_clauses = []
    params: list = []

    if filters:
        if filters.get("provider"):
            where_clauses.append("provider = ?")
            params.append(filters["provider"])
        if filters.get("is_blocked") is not None:
            where_clauses.append("is_blocked = ?")
            params.append(1 if filters["is_blocked"] else 0)
        if filters.get("agent_id"):
            where_clauses.append("agent_id = ?")
            params.append(filters["agent_id"])
        if filters.get("start_date"):
            where_clauses.append("timestamp >= ?")
            params.append(filters["start_date"])
        if filters.get("end_date"):
            where_clauses.append("timestamp <= ?")
            params.append(filters["end_date"])

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    offset = (page - 1) * limit
    params.extend([limit, offset])

    async with db.execute(
        f"SELECT * FROM request_log {where_sql} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        params,
    ) as cursor:
        rows = await cursor.fetchall()

    return [_deserialize_log(dict(row)) for row in rows]


async def get_log(request_id: str) -> dict | None:
    db = await get_db()
    async with db.execute(
        "SELECT * FROM request_log WHERE request_id = ?", (request_id,)
    ) as cursor:
        row = await cursor.fetchone()
    return _deserialize_log(dict(row)) if row else None


async def get_stats() -> dict:
    db = await get_db()
    today = datetime.now(timezone.utc).date().isoformat()

    async with db.execute(
        "SELECT COUNT(*) as total, SUM(is_blocked) as blocked, AVG(latency_ms) as avg_latency "
        "FROM request_log WHERE DATE(timestamp) = ?",
        (today,),
    ) as cursor:
        row = await cursor.fetchone()

    async with db.execute(
        "SELECT COUNT(*) as alerts FROM alerts WHERE DATE(timestamp) = ?", (today,)
    ) as cursor:
        alert_row = await cursor.fetchone()

    return {
        "total_today": row["total"] or 0,
        "blocked_today": row["blocked"] or 0,
        "alerts_today": alert_row["alerts"] or 0,
        "avg_latency_ms": round(row["avg_latency"] or 0, 1),
    }


def _deserialize_log(row: dict) -> dict:
    if "plugin_results_json" in row and row["plugin_results_json"]:
        row["plugin_results"] = json.loads(row["plugin_results_json"])
    else:
        row["plugin_results"] = []
    row.pop("plugin_results_json", None)
    return row
