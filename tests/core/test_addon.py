"""T029 — Addon pipeline behavior tests."""
from __future__ import annotations
import asyncio
import json
import pytest
import pytest_asyncio
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../proxy"))

from unittest.mock import AsyncMock, MagicMock, patch
from core.plugin_result import PluginResult
from core.plugin_loader import PluginLoader, LoadedPlugin


def _make_loaded(plugin_id: str, hooks: list, on_error: str = "pass",
                 timeout_ms: int = 100) -> LoadedPlugin:
    manifest = {
        "contract_version": "1.0", "id": plugin_id, "name": plugin_id,
        "version": "1.0.0", "runtime": "python", "hooks": hooks,
        "config_schema": {}, "on_error": on_error, "timeout_ms": timeout_ms,
    }
    plugin_class = MagicMock
    module = MagicMock()
    return LoadedPlugin(manifest, plugin_class, module)


def _make_addon(plugins: list[LoadedPlugin], queue: asyncio.Queue | None = None):
    from core.addon import AgentWallAddon

    loader = MagicMock(spec=PluginLoader)
    loader.get = lambda pid: next((p for p in plugins if p.plugin_id == pid), None)
    if queue is None:
        queue = asyncio.Queue()
    addon = AgentWallAddon(loader, queue)
    return addon, queue


def _make_flow(body: dict, host: str = "api.anthropic.com"):
    flow = MagicMock()
    flow.request.pretty_host = host
    flow.request.pretty_url = f"https://{host}/v1/messages"
    flow.request.method = "POST"
    flow.request.content = json.dumps(body).encode()
    flow.request.headers = {}
    flow.response = None
    return flow


# ── Pipeline order ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_pipeline_executes_in_order(db):
    order = []
    loaded1 = _make_loaded("t/p1", ["onRequest"])
    loaded2 = _make_loaded("t/p2", ["onRequest"])

    p1_instance = MagicMock()
    p1_instance.on_request = lambda ctx: (order.append("p1"), PluginResult.pass_through())[1]
    p2_instance = MagicMock()
    p2_instance.on_request = lambda ctx: (order.append("p2"), PluginResult.pass_through())[1]

    loaded1.instantiate = lambda cfg: p1_instance
    loaded2.instantiate = lambda cfg: p2_instance

    addon, queue = _make_addon([loaded1, loaded2])

    with patch.object(addon, "_get_active_plugins", AsyncMock(return_value=[loaded1, loaded2])), \
         patch.object(addon, "_get_config", AsyncMock(return_value={})), \
         patch.object(addon, "_emit_request_event", AsyncMock()):
        await addon._handle_request(_make_flow({"messages": []}))

    assert order == ["p1", "p2"]


@pytest.mark.asyncio
async def test_block_stops_pipeline(db):
    called = []
    loaded1 = _make_loaded("t/p1", ["onRequest"])
    loaded2 = _make_loaded("t/p2", ["onRequest"])

    p1_instance = MagicMock()
    p1_instance.on_request = lambda ctx: PluginResult.block("blocked by p1")
    p2_instance = MagicMock()
    p2_instance.on_request = lambda ctx: (called.append("p2"), PluginResult.pass_through())[1]

    loaded1.instantiate = lambda cfg: p1_instance
    loaded2.instantiate = lambda cfg: p2_instance

    flow = _make_flow({"messages": []})

    addon, _ = _make_addon([loaded1, loaded2])
    with patch.object(addon, "_get_active_plugins", AsyncMock(return_value=[loaded1, loaded2])), \
         patch.object(addon, "_get_config", AsyncMock(return_value={})), \
         patch.object(addon, "_emit_request_event", AsyncMock()):
        await addon._handle_request(flow)

    assert "p2" not in called
    assert flow.response is not None
    assert flow.response.status_code == 403


@pytest.mark.asyncio
async def test_mutate_updates_body_and_continues(db):
    loaded1 = _make_loaded("t/p1", ["onRequest"])
    loaded2 = _make_loaded("t/p2", ["onRequest"])

    seen_by_p2 = []
    new_body = {"messages": [{"role": "user", "content": "MUTATED"}]}

    p1_instance = MagicMock()
    p1_instance.on_request = lambda ctx: PluginResult.mutate(new_body, "mutated")
    p2_instance = MagicMock()

    def p2_hook(ctx):
        seen_by_p2.append(ctx.body_parsed)
        return PluginResult.pass_through()

    p2_instance.on_request = p2_hook
    loaded1.instantiate = lambda cfg: p1_instance
    loaded2.instantiate = lambda cfg: p2_instance

    addon, _ = _make_addon([loaded1, loaded2])
    with patch.object(addon, "_get_active_plugins", AsyncMock(return_value=[loaded1, loaded2])), \
         patch.object(addon, "_get_config", AsyncMock(return_value={})), \
         patch.object(addon, "_emit_request_event", AsyncMock()):
        await addon._handle_request(_make_flow({"messages": []}))

    assert seen_by_p2[0] == new_body


@pytest.mark.asyncio
async def test_alert_continues_pipeline(db):
    called = []
    loaded1 = _make_loaded("t/p1", ["onRequest"])
    loaded2 = _make_loaded("t/p2", ["onRequest"])

    p1_instance = MagicMock()
    p1_instance.on_request = lambda ctx: PluginResult.alert("secret found", {"key": "val"})
    p2_instance = MagicMock()
    p2_instance.on_request = lambda ctx: (called.append("p2"), PluginResult.pass_through())[1]
    loaded1.instantiate = lambda cfg: p1_instance
    loaded2.instantiate = lambda cfg: p2_instance

    addon, _ = _make_addon([loaded1, loaded2])
    with patch.object(addon, "_get_active_plugins", AsyncMock(return_value=[loaded1, loaded2])), \
         patch.object(addon, "_get_config", AsyncMock(return_value={})), \
         patch.object(addon, "_emit_request_event", AsyncMock()), \
         patch.object(addon, "_emit_alert", AsyncMock()):
        await addon._handle_request(_make_flow({"messages": []}))

    assert "p2" in called


@pytest.mark.asyncio
async def test_timeout_returns_pass(db):
    loaded1 = _make_loaded("t/p1", ["onRequest"], timeout_ms=10)

    async def slow_hook(ctx):
        await asyncio.sleep(10)
        return PluginResult.block("should not reach")

    p1_instance = MagicMock()
    p1_instance.on_request = slow_hook
    loaded1.instantiate = lambda cfg: p1_instance

    flow = _make_flow({"messages": []})
    addon, _ = _make_addon([loaded1])
    with patch.object(addon, "_get_active_plugins", AsyncMock(return_value=[loaded1])), \
         patch.object(addon, "_get_config", AsyncMock(return_value={})), \
         patch.object(addon, "_emit_request_event", AsyncMock()):
        await addon._handle_request(flow)

    assert flow.response is None  # not blocked = pass


@pytest.mark.asyncio
async def test_exception_on_error_pass_returns_pass(db):
    loaded1 = _make_loaded("t/p1", ["onRequest"], on_error="pass")

    p1_instance = MagicMock()
    p1_instance.on_request = MagicMock(side_effect=RuntimeError("boom"))
    p1_instance.on_error = None
    loaded1.instantiate = lambda cfg: p1_instance

    flow = _make_flow({"messages": []})
    addon, _ = _make_addon([loaded1])
    with patch.object(addon, "_get_active_plugins", AsyncMock(return_value=[loaded1])), \
         patch.object(addon, "_get_config", AsyncMock(return_value={})), \
         patch.object(addon, "_emit_request_event", AsyncMock()):
        await addon._handle_request(flow)

    assert flow.response is None


@pytest.mark.asyncio
async def test_exception_on_error_block_returns_block(db):
    loaded1 = _make_loaded("t/p1", ["onRequest"], on_error="block")

    p1_instance = MagicMock()
    p1_instance.on_request = MagicMock(side_effect=RuntimeError("boom"))
    p1_instance.on_error = None
    loaded1.instantiate = lambda cfg: p1_instance

    flow = _make_flow({"messages": []})
    addon, _ = _make_addon([loaded1])
    with patch.object(addon, "_get_active_plugins", AsyncMock(return_value=[loaded1])), \
         patch.object(addon, "_get_config", AsyncMock(return_value={})), \
         patch.object(addon, "_emit_request_event", AsyncMock()):
        await addon._handle_request(flow)

    assert flow.response is not None
    assert flow.response.status_code == 403
