-- Fix column name mismatches between 001_initial.sql and the Python repository layer.
-- request_log: id→request_id, blocked→is_blocked, add block_reason
-- alerts: id→alert_id, created_at→timestamp, reason→message, acknowledged→is_acknowledged

DROP TABLE IF EXISTS request_log;
CREATE TABLE IF NOT EXISTS request_log (
    request_id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    agent_id TEXT,
    provider TEXT,
    model TEXT,
    destination TEXT,
    method TEXT,
    status_code INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    estimated_tokens INTEGER,
    latency_ms INTEGER,
    is_blocked INTEGER NOT NULL DEFAULT 0,
    block_reason TEXT,
    plugin_results_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_request_log_timestamp ON request_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_request_log_provider ON request_log(provider);
CREATE INDEX IF NOT EXISTS idx_request_log_is_blocked ON request_log(is_blocked);

DROP TABLE IF EXISTS alerts;
CREATE TABLE IF NOT EXISTS alerts (
    alert_id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    plugin_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL DEFAULT '',
    payload_json TEXT,
    is_acknowledged INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_alerts_is_acknowledged ON alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
