from __future__ import annotations
import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from mitmproxy import http
from mitmproxy.options import Options

from core.context import RequestContext, ResponseContext, ErrorContext
from core.plugin_result import PluginResult
from core.storage import PluginStorage
from core.logger import PluginLogger

if TYPE_CHECKING:
    from core.plugin_loader import PluginLoader, LoadedPlugin

ANTHROPIC_HOSTS = {"api.anthropic.com"}
OPENAI_HOSTS = {"api.openai.com"}


def _detect_provider(host: str) -> str:
    if host in ANTHROPIC_HOSTS:
        return "anthropic"
    if host in OPENAI_HOSTS:
        return "openai"
    return "unknown"


def _parse_body(raw: bytes) -> dict | None:
    try:
        return json.loads(raw)
    except Exception:
        return None


def _estimate_tokens(body: dict | None) -> int:
    if not body:
        return 0
    messages = body.get("messages") or []
    chars = sum(len(str(m.get("content", ""))) for m in messages)
    return max(1, chars // 4)


def _extract_model(body: dict | None) -> str | None:
    if not body:
        return None
    return body.get("model")


def _extract_messages(body: dict | None) -> list | None:
    if not body:
        return None
    return body.get("messages")


class AgentWallAddon:
    def __init__(self, plugin_loader: "PluginLoader", event_queue: asyncio.Queue) -> None:
        self._loader = plugin_loader
        self._queue = event_queue
        # request_id → (start_time, request_context_shared)
        self._pending: dict[str, tuple[float, dict]] = {}

    def request(self, flow: http.HTTPFlow) -> None:
        asyncio.get_event_loop().run_until_complete(self._handle_request(flow))

    def response(self, flow: http.HTTPFlow) -> None:
        asyncio.get_event_loop().run_until_complete(self._handle_response(flow))

    async def _handle_request(self, flow: http.HTTPFlow) -> None:
        request_id = str(uuid.uuid4())
        flow.request.headers["x-agentwall-request-id"] = request_id
        start = time.monotonic()

        host = flow.request.pretty_host
        provider = _detect_provider(host)
        body_raw = flow.request.content or b""
        body_parsed = _parse_body(body_raw)
        shared: dict = {}

        active_plugins = await self._get_active_plugins()
        current_body = body_parsed
        is_blocked = False
        block_reason = ""
        plugin_results = []

        for loaded in active_plugins:
            if "onRequest" not in loaded.hooks:
                continue

            config = await self._get_config(loaded.plugin_id)
            storage = PluginStorage(loaded.plugin_id)
            logger = PluginLogger(loaded.plugin_id, request_id)
            plugin_instance = loaded.instantiate(config)

            ctx = RequestContext(
                request_id=request_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                agent_id=flow.request.headers.get("x-agent-id", "unknown"),
                url=flow.request.pretty_url,
                method=flow.request.method,
                destination=host,
                provider=provider,
                headers=dict(flow.request.headers),
                body_raw=body_raw,
                body_parsed=current_body,
                model=_extract_model(current_body),
                messages=_extract_messages(current_body),
                estimated_tokens=_estimate_tokens(current_body),
                config=config,
                storage=storage,
                logger=logger,
                shared=shared,
            )

            result = await self._run_hook(plugin_instance, "on_request", ctx, loaded)
            plugin_results.append({
                "plugin_id": loaded.plugin_id,
                "action": result.action,
                "reason": result.reason,
            })

            if result.action == "block":
                is_blocked = True
                block_reason = result.reason or loaded.plugin_id
                break
            elif result.action == "mutate" and result.mutated_body:
                current_body = result.mutated_body
                flow.request.content = json.dumps(current_body).encode()
            elif result.action == "alert" and result.alert_payload is not None:
                await self._emit_alert(loaded.plugin_id, request_id, result)

        self._pending[request_id] = (start, shared)

        if is_blocked:
            flow.response = http.Response.make(
                403,
                json.dumps({"error": "blocked", "reason": block_reason}),
                {"Content-Type": "application/json"},
            )
            await self._emit_request_event(
                request_id=request_id,
                provider=provider,
                model=_extract_model(current_body),
                estimated_tokens=_estimate_tokens(current_body),
                is_blocked=True,
                block_reason=block_reason,
                plugin_results=plugin_results,
                latency_ms=int((time.monotonic() - start) * 1000),
            )
            self._pending.pop(request_id, None)
        elif current_body is not None and current_body != body_parsed:
            flow.request.content = json.dumps(current_body).encode()

    async def _handle_response(self, flow: http.HTTPFlow) -> None:
        request_id = flow.request.headers.get("x-agentwall-request-id", "")
        pending = self._pending.pop(request_id, None)
        start, shared = pending if pending else (time.monotonic(), {})
        latency_ms = int((time.monotonic() - start) * 1000)

        if not flow.response:
            return

        host = flow.request.pretty_host
        provider = _detect_provider(host)
        body_raw = flow.response.content or b""
        body_parsed = _parse_body(body_raw)
        plugin_results = []

        active_plugins = await self._get_active_plugins()

        for loaded in active_plugins:
            if "onResponse" not in loaded.hooks:
                continue

            config = await self._get_config(loaded.plugin_id)
            storage = PluginStorage(loaded.plugin_id)
            logger = PluginLogger(loaded.plugin_id, request_id)
            plugin_instance = loaded.instantiate(config)

            input_tokens, output_tokens = _parse_token_usage(body_parsed)
            ctx = ResponseContext(
                request_id=request_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                agent_id=flow.request.headers.get("x-agent-id", "unknown"),
                provider=provider,
                model=_extract_model(body_parsed),
                status_code=flow.response.status_code,
                headers=dict(flow.response.headers),
                body_raw=body_raw,
                body_parsed=body_parsed,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                config=config,
                storage=storage,
                logger=logger,
                shared=shared,
            )

            result = await self._run_hook(plugin_instance, "on_response", ctx, loaded)
            plugin_results.append({
                "plugin_id": loaded.plugin_id,
                "action": result.action,
                "reason": result.reason,
            })

            if result.action == "alert" and result.alert_payload is not None:
                await self._emit_alert(loaded.plugin_id, request_id, result)

        input_tokens, output_tokens = _parse_token_usage(body_parsed)
        await self._emit_request_event(
            request_id=request_id,
            provider=provider,
            model=_extract_model(body_parsed) or _extract_model(_parse_body(flow.request.content or b"")),
            estimated_tokens=_estimate_tokens(_parse_body(flow.request.content or b"")),
            is_blocked=False,
            block_reason=None,
            plugin_results=plugin_results,
            latency_ms=latency_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            status_code=flow.response.status_code,
        )

    async def _run_hook(
        self, instance: object, hook: str, ctx: object, loaded: "LoadedPlugin"
    ) -> PluginResult:
        try:
            method = getattr(instance, hook, None)
            if method is None:
                return PluginResult.pass_through()

            timeout_s = loaded.timeout_ms / 1000.0
            coro = method(ctx) if asyncio.iscoroutinefunction(method) else asyncio.to_thread(method, ctx)
            result = await asyncio.wait_for(coro, timeout=timeout_s)

            if not isinstance(result, PluginResult):
                raise TypeError(f"hook returned {type(result)}, expected PluginResult")
            return result

        except asyncio.TimeoutError:
            loaded.plugin_class  # keep reference
            if loaded.on_error == "block":
                return PluginResult.block(f"plugin {loaded.plugin_id} timed out")
            return PluginResult.pass_through()

        except Exception as exc:
            try:
                on_error_hook = getattr(instance, "on_error", None)
                if callable(on_error_hook):
                    err_ctx = ErrorContext(
                        request_id=getattr(ctx, "request_id", ""),
                        plugin_id=loaded.plugin_id,
                        error=exc,
                        phase="request" if hook == "on_request" else "response",
                    )
                    on_error_hook(err_ctx)
            except Exception:
                pass

            if loaded.on_error == "block":
                return PluginResult.block(f"plugin {loaded.plugin_id} error: {exc}")
            return PluginResult.pass_through()

    async def _get_active_plugins(self) -> list["LoadedPlugin"]:
        from db.repositories.plugin_repo import get_active_plugins_ordered

        rows = await get_active_plugins_ordered()
        result = []
        for row in rows:
            loaded = self._loader.get(row["id"])
            if loaded:
                result.append(loaded)
        return result

    async def _get_config(self, plugin_id: str) -> dict:
        from db.repositories.config_repo import get_config

        return await get_config(plugin_id)

    async def _emit_request_event(self, **kwargs) -> None:
        from db.repositories.log_repo import save_request_log

        event = {"type": "request", **kwargs}
        try:
            await save_request_log({
                "request_id": kwargs.get("request_id", ""),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "provider": kwargs.get("provider"),
                "model": kwargs.get("model"),
                "destination": kwargs.get("destination"),
                "method": kwargs.get("method", "POST"),
                "status_code": kwargs.get("status_code"),
                "input_tokens": kwargs.get("input_tokens"),
                "output_tokens": kwargs.get("output_tokens"),
                "latency_ms": kwargs.get("latency_ms"),
                "is_blocked": kwargs.get("is_blocked", False),
                "block_reason": kwargs.get("block_reason"),
                "plugin_results": kwargs.get("plugin_results", []),
            })
        except Exception:
            pass  # fail-open: log persistence must never break the proxy

        try:
            self._queue.put_nowait(event)
        except asyncio.QueueFull:
            pass

    async def _emit_alert(self, plugin_id: str, request_id: str, result: PluginResult) -> None:
        import uuid as _uuid
        from db.repositories.alert_repo import save_alert

        alert_id = str(_uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        event = {
            "type": "alert",
            "alert_id": alert_id,
            "plugin_id": plugin_id,
            "request_id": request_id,
            "message": result.reason or "",
            "payload": result.alert_payload or {},
            "timestamp": timestamp,
        }
        try:
            await save_alert({
                "alert_id": alert_id,
                "timestamp": timestamp,
                "plugin_id": plugin_id,
                "request_id": request_id,
                "severity": "warning",
                "message": result.reason or "",
                "payload": result.alert_payload or {},
            })
        except Exception:
            pass  # fail-open

        try:
            self._queue.put_nowait(event)
        except asyncio.QueueFull:
            pass


def _parse_token_usage(body: dict | None) -> tuple[int | None, int | None]:
    if not body:
        return None, None
    usage = body.get("usage") or {}
    input_t = usage.get("input_tokens") or usage.get("prompt_tokens")
    output_t = usage.get("output_tokens") or usage.get("completion_tokens")
    return input_t, output_t
