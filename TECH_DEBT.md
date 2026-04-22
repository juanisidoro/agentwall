# AgentWall — Technical Debt Register

## [2026-04-22] DB migration schema mismatch (fixed)

**What was skipped**: `001_initial.sql` defined `request_log` with columns `id`, `blocked` and `alerts` with `id`, `reason`, `created_at`, `acknowledged` — but the Python repository layer used `request_id`, `is_blocked`, `block_reason` and `alert_id`, `message`, `timestamp`, `is_acknowledged` respectively.

**Fix applied**: Created `002_fix_column_names.sql` migration that drops and recreates both tables with the correct column names matching the repository layer.

**Why it was taken**: The column names were probably refactored in the Python layer without updating the SQL migration. No data was lost since the DB was fresh.

**Should be resolved by**: Already resolved. Verify with integration tests in T073.

---

## [2026-04-22] Settings API used wrong table (fixed)

**What was skipped**: `api/settings.py` used `config_repo.get_config("__global__")` / `set_config` which reads/writes `plugin_configs` table. But `plugin_configs` has an FK constraint to `plugins(id)`, so writes with `plugin_id = "__global__"` would fail with a constraint error.

**Fix applied**: Added `db/repositories/settings_repo.py` that reads/writes the `settings` table (which was created in migration 001 for exactly this purpose). Updated `api/settings.py` to use the new repo.

**Why it was taken**: The settings API was wired to the wrong repository. The `settings` table already existed and was pre-populated with `agent_id` and `onboarding_complete` rows.

**Should be resolved by**: Already resolved. No further action needed.

---

## [2026-04-22] RequestFeed not virtualized

**What was skipped**: `RequestFeed.tsx` renders up to 200 DOM rows without virtualization. At 200 rows of 40px each, this is 8KB of DOM — acceptable for this scale but not ideal for thousands of rows.

**Why**: react-window/react-virtual would add complexity and a dependency. 200 rows is the store cap, so the list is bounded.

**Should be resolved by**: If the store cap increases beyond 500 or performance issues appear in profiling.

---

## [2026-04-22] rjsf chunk size

**What was skipped**: `@rjsf/core` + `@rjsf/validator-ajv8` contribute ~541KB to the JS bundle (172KB gzipped). No code splitting applied.

**Why**: The dashboard is a dev tool, not a consumer app. Load time is not a priority.

**Should be resolved by**: T066 (Dockerfile). Consider lazy-loading the Plugins page if bundle size becomes a concern.
