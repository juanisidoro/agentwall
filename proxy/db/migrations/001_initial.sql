CREATE TABLE IF NOT EXISTS plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    manifest_json TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    install_order INTEGER NOT NULL DEFAULT 0,
    installed_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plugin_configs (
    plugin_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (plugin_id, key),
    FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plugin_storage (
    plugin_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (plugin_id, key)
);

CREATE TABLE IF NOT EXISTS request_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    agent_id TEXT,
    provider TEXT,
    model TEXT,
    destination TEXT,
    method TEXT,
    status_code INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    latency_ms INTEGER,
    plugin_results_json TEXT,
    blocked INTEGER NOT NULL DEFAULT 0,
    alerted INTEGER NOT NULL DEFAULT 0,
    mutated INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_request_log_timestamp ON request_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_request_log_provider ON request_log(provider);
CREATE INDEX IF NOT EXISTS idx_request_log_blocked ON request_log(blocked);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    plugin_id TEXT NOT NULL,
    reason TEXT,
    payload_json TEXT,
    severity TEXT NOT NULL DEFAULT 'medium',
    acknowledged INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (request_id) REFERENCES request_log(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('agent_id', '"default"');
INSERT OR IGNORE INTO settings (key, value) VALUES ('proxy_port', '8080');
INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_complete', 'false');
