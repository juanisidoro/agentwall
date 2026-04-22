# AgentWall

> Open-source plugin framework for AI agent proxy security.

AgentWall sits between any AI agent and LLM APIs (Anthropic, OpenAI, etc.). It intercepts HTTPS traffic at the **network level** — no code changes required in your agent. Point `HTTPS_PROXY=http://localhost:8080` and you're protected.

## What it does

- **Secret scanning** — detects and redacts API keys, passwords, and credentials before they leave your network
- **Token budget control** — blocks requests that exceed configured token or spend limits
- **Real-time dashboard** — shows every intercepted request with plugin results, latency, and payload preview
- **Plugin system** — install community plugins from PyPI or write your own; hot-reload with no restarts
- **AI plugin builder** — describe a plugin in plain language, get working code in seconds
- **MCP server** — build and install plugins from Claude Code without leaving your editor

## Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/your-user/agentwall/main/install.sh | bash
```

Then open [http://localhost:9090/app](http://localhost:9090/app)

## Connect your agent

```bash
export HTTPS_PROXY=http://localhost:8080
export NODE_EXTRA_CA_CERTS=/path/to/agentwall-ca.pem  # downloaded from the dashboard
```

Works with **Claude Code**, **OpenClaw**, and any agent that supports standard HTTP proxy environment variables.

## How it works

```
Your agent (HTTPS_PROXY=localhost:8080)
  └─► mitmproxy :8080
        └─► plugin pipeline
              ├─► secret_scanner  → redact / block / alert
              ├─► token_counter   → block if over budget
              └─► your plugins    → anything you want
                    └─► LLM API (Anthropic, OpenAI, ...)
                          └─► response back through pipeline
                                └─► dashboard (real-time WebSocket)
```

## Writing a plugin

```python
def get_manifest() -> dict:
    return {
        "contract_version": "1.0",
        "id": "you/my-plugin",
        "name": "My Plugin",
        "version": "1.0.0",
        "runtime": "python",
        "hooks": ["onRequest"],
        "config_schema": {"type": "object", "properties": {}}
    }

class Plugin:
    def on_request(self, ctx) -> PluginResult:
        return PluginResult.pass_through()
```

## MCP server (Claude Code)

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "agentwall": {
      "url": "http://localhost:9090/mcp",
      "transport": "http"
    }
  }
}
```

Then use `get_contract()`, `scaffold_plugin()`, `install_plugin_from_code()` directly from Claude Code.

## Stack

- **Proxy**: mitmproxy 10+
- **Backend**: Python 3.12, FastAPI, aiosqlite, fastmcp
- **Frontend**: Vite, React 18, TypeScript, shadcn/ui, Tailwind
- **Deploy**: Docker + Docker Compose (single container)

## Contributing

Plugin contract v1.0 is stable. Build a plugin, publish to PyPI with the `agentwall-` prefix, and it's installable from the dashboard.

## License

MIT
