<!--
SYNC IMPACT REPORT
==================
Version change: none → 1.0.0 (initial ratification)
Added sections: Core Principles (10), Technology Stack, Architecture Constraints, Development Workflow, Governance
Removed sections: all placeholder tokens replaced
Templates updated:
  ✅ .specify/templates/plan-template.md — Constitution Check gates derived from principles below
  ✅ .specify/templates/spec-template.md — scope/requirements aligned with plugin contract rules
  ✅ .specify/templates/tasks-template.md — task phases reflect layer separation and plugin pipeline
Deferred TODOs: none
-->

# AgentWall Constitution

## Core Principles

### I. Fail-Open (NON-NEGOTIABLE)

If AgentWall encounters any internal failure — plugin exception, timeout, DB error, proxy crash — the user's AI agent MUST continue operating normally. Traffic MUST flow through unimpeded.

- Default `on_error` behavior for every plugin MUST be `pass`
- The only exception: plugins that explicitly declare `on_error: "block"` — the user consciously accepts that risk
- No AgentWall internal error MAY propagate to the proxied agent as an HTTP error
- Every failure MUST be logged and surfaced in the dashboard; silence is forbidden

**Rationale**: A security tool that breaks production is worse than no security tool. Trust is built by never interfering with the user's primary workflow.

### II. Plugin Contract Is Sacred (NON-NEGOTIABLE)

The plugin contract (`core/context.py` + `core/plugin_result.py`) is the public API to the community. Any breaking change destroys contributor and user trust.

- Field names in `RequestContext` and `ResponseContext` MUST never be renamed or removed without a MAJOR version bump
- Possible `action` values (`pass`, `block`, `mutate`, `alert`) MUST never change without a MAJOR version bump
- `get_manifest()` signature MUST never change without a MAJOR version bump
- The class name `Plugin` and hook names (`on_request`, `on_response`, `on_error`) MUST never change
- Required manifest fields MUST never be removed: `contract_version`, `id`, `name`, `version`, `runtime`, `hooks`, `config_schema`
- New optional fields MAY be added with a MINOR version bump
- `contract_version` in the manifest declares which version of the contract a plugin targets; the runner MUST reject plugins with an unsupported version

### III. Zero Magic

Any contributor MUST be able to understand the full request-interception flow in under 30 minutes by reading the code alone.

- No implicit behavior: every side effect MUST be traceable to an explicit call
- No monkey-patching, no metaclasses, no dynamic attribute injection in core modules
- Complexity MUST be justified by measurable user value; otherwise choose the simpler path
- When ambiguity arises during implementation: choose the simplest option, document it in an inline comment, register in `TECH_DEBT.md`

### IV. Network-Level Interception

AgentWall MUST operate as a transparent HTTPS proxy. Zero application-code changes MUST be required in the intercepted agent.

- Any agent supporting `HTTP_PROXY` / `HTTPS_PROXY` environment variables MUST work with AgentWall without modification
- mitmproxy MUST be the proxy core — battle-tested TLS interception with Python addon support
- Pass-through latency overhead (no active plugins) MUST be < 50ms

### V. Privacy by Default

Request and response bodies are sensitive. They contain prompts, API keys, and user data.

- Full request/response bodies MUST only exist in memory during plugin pipeline execution
- Bodies MUST never be written to disk or persisted in the database
- Only metadata MAY be stored: tokens, model, provider, latency, plugin action results
- The CA certificate private key MUST never be served via API or committed to the repository
- `/api/cert` MUST serve only the public `.pem` certificate

### VI. Strict Layer Separation

The codebase MUST respect four layers with unidirectional dependency flow:

```
core/    → zero imports from api/, db/, mcp/
db/      → MAY import core/ (for types only). MUST NOT import api/ or mcp/
api/     → MAY import core/ and db/. MUST NOT import mcp/
mcp/     → MAY import core/ and db/. MUST NOT import api/
plugins/ → MUST import ONLY core/context and core/plugin_result
```

Lateral imports between modules at the same layer are forbidden. A layer violation is an architecture bug, not a logic bug — it MUST be fixed before merging.

### VII. Repository Pattern (No Naked SQL)

No SQL query MAY exist outside of `db/repositories/`. This is non-negotiable.

- API routes MUST call repository functions, never execute SQL directly
- The mitmproxy addon MUST call repository functions, never execute SQL directly
- Repository functions MUST use domain language: `get_active_plugins_ordered()`, not `SELECT * FROM plugins WHERE...`
- SQLite MUST be initialized with `PRAGMA journal_mode=WAL` and `PRAGMA foreign_keys=ON`

### VIII. Open/Closed for Plugins

Adding a new plugin MUST require zero modifications to core AgentWall code.

- New plugins are added by implementing the plugin contract and dropping them in the plugins directory
- Adding a new LLM provider detection MUST not require changes to the interception logic
- The plugin system IS the extension point — core MUST remain closed to modification, open to extension

### IX. Ubiquitous Language

The same terms MUST be used in code, documentation, issues, and conversation without exception.

| Term | Definition |
|------|------------|
| `plugin` | Python package implementing the AgentWall contract |
| `hook` | Plugin method called at a lifecycle point (`on_request`, `on_response`) |
| `flow` | mitmproxy object representing a complete HTTP connection |
| `pipeline` | Sequence of plugins executed in order over a flow |
| `manifest` | Dict returned by `get_manifest()` describing the plugin |
| `runner` | The mitmproxy addon that executes the plugin pipeline |
| `provider` | Detected LLM provider: `anthropic`, `openai`, `unknown` |
| `contract_version` | Version of the plugin contract declared in the manifest |
| `request_id` | UUID4 uniquely identifying a single proxied request |

If a term is ambiguous, it MUST be resolved explicitly and added to this glossary before implementation proceeds.

### X. File Size and Single Responsibility

- Files MUST NOT exceed ~300 lines. Growth beyond this signals mixed responsibilities — split the file.
- One responsibility per file. No `utils.py` catch-alls.
- A case of use = one function or one module. `core/plugin_loader.py` loads plugins; `api/plugins.py` handles routes; `db/repositories/plugin_repo.py` queries the plugins table.

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Proxy core | mitmproxy 10+ | Battle-tested TLS MITM, Python addon system |
| API server | FastAPI + uvicorn | Async-native, OpenAPI docs included |
| Dashboard | Vite + React 18 + TypeScript | Lightweight SPA, no Node in production image |
| UI components | shadcn/ui + Tailwind CSS | Copy-paste components, zero heavy deps |
| Database | SQLite via aiosqlite | Zero config, single file, WAL mode |
| MCP server | fastmcp | Simplest MCP implementation in Python |
| State management | Zustand | Minimal, no boilerplate |
| Plugin config forms | react-jsonschema-form (rjsf) | Auto-generates forms from JSON Schema |
| Container | Docker + Docker Compose | One-command install |

**Process architecture**: mitmproxy and FastAPI MUST share the same asyncio event loop. No Redis, no message broker, no IPC. Events flow via `asyncio.Queue` from the mitmproxy addon to the WebSocket handler.

## Architecture Constraints

### Naming Conventions

**Python**
- Variables and functions: `snake_case`
- Classes and dataclasses: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Files and modules: `snake_case`
- Interfaces (ABC): `I` prefix — `IPluginStorage`, `IPluginLogger`
- Repositories: `_repo` suffix — `plugin_repo.py`

**TypeScript**
- Variables and functions: `camelCase`
- React components and types: `PascalCase`
- Interfaces: `I` prefix — `IPlugin`
- Component files: `PascalCase.tsx`
- Utility files: `camelCase.ts`
- Constants: `SCREAMING_SNAKE_CASE`

**Database**
- Tables: `snake_case` plural
- Columns: `snake_case`
- Indexes: `idx_table_column`
- Migrations: `NNN_short-description.sql` — never modify an applied migration

**Environment variables**: `SCREAMING_SNAKE_CASE` with `AGENTWALL_` prefix.

### Commit Convention (Conventional Commits)

Format: `type(scope): description` in English.

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
Scopes: `proxy`, `dashboard`, `plugins`, `mcp`, `docker`, `ci`

### Conscious Technical Debt

Every shortcut taken during implementation MUST be recorded in `TECH_DEBT.md` with: what was skipped, why, and when it should be resolved.

## Development Workflow

### Per-Session Protocol (with Claude Code)

1. Read `CLAUDE.md` at session start
2. Read the current feature spec in `.specify/specs/[feature]/`
3. Generate a concrete task checklist for the session
4. Implement step by step — one task at a time
5. Mark task complete in `tasks.md`
6. Register in `TECH_DEBT.md` if any shortcut was taken

### Versioning (Semantic Versioning)

| Bump | When |
|------|------|
| MAJOR | Breaking change in the plugin contract |
| MINOR | New feature, backward-compatible (new endpoint, optional context field) |
| PATCH | Bug fix, performance improvement, docs |

### Implementation Order

Each task MUST be independently testable before moving to the next. Never advance to a subsequent phase without a working, testable artifact from the current one.

## Governance

This constitution supersedes all other practices, conventions, and README instructions. When a conflict exists, the constitution wins.

**Amendment procedure**:
1. Propose the amendment in writing with rationale
2. Bump `CONSTITUTION_VERSION` following semantic versioning rules above
3. Update `LAST_AMENDED_DATE`
4. Propagate changes to all affected templates and the `CLAUDE.md` guidance file
5. Record the amendment in `CHANGELOG.md`

**Compliance**: Every implementation task and code review MUST verify compliance with the principles above, particularly Principles I (Fail-Open), II (Plugin Contract), and VI (Layer Separation). Violations block merging.

**Runtime guidance**: Use `CLAUDE.md` (in `.claude/`) for session-level implementation guidance. Use `.specify/specs/[feature]/` for feature-specific context.

**Version**: 1.0.0 | **Ratified**: 2026-04-22 | **Last Amended**: 2026-04-22
