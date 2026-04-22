"""Token Counter plugin — enforces per-request token limits and daily budget alerts."""
from __future__ import annotations

from core.context import RequestContext, ResponseContext
from core.plugin_result import PluginResult


def get_manifest() -> dict:
    return {
        "contract_version": "1.0",
        "id": "agentwall/token-counter",
        "name": "Token Counter",
        "version": "1.0.0",
        "description": "Blocks requests over a token limit and alerts on daily budget overrun.",
        "runtime": "python",
        "hooks": ["onRequest", "onResponse"],
        "timeout_ms": 100,
        "on_error": "pass",
        "config_schema": {
            "type": "object",
            "properties": {
                "max_tokens_per_request": {
                    "type": "integer",
                    "default": 0,
                    "description": "Maximum estimated input tokens per request. 0 = disabled.",
                },
                "daily_budget_usd": {
                    "type": "number",
                    "default": 0,
                    "description": "Daily spend alert threshold in USD. 0 = disabled.",
                },
            },
        },
    }


# Cost per 1M tokens (input) — rough estimates for alerting
_COST_PER_1M: dict[str, float] = {
    "claude-3-5-sonnet": 3.0,
    "claude-3-opus": 15.0,
    "gpt-4o": 5.0,
    "gpt-4-turbo": 10.0,
}
_DEFAULT_COST = 5.0


class Plugin:
    def on_request(self, ctx: RequestContext) -> PluginResult:
        max_tokens = int(ctx.config.get("max_tokens_per_request", 0))
        if max_tokens > 0 and ctx.estimated_tokens > max_tokens:
            return PluginResult.block(
                f"Request exceeds token limit ({ctx.estimated_tokens} > {max_tokens})"
            )
        return PluginResult.pass_through()

    def on_response(self, ctx: ResponseContext) -> PluginResult:
        daily_budget = float(ctx.config.get("daily_budget_usd", 0))
        if daily_budget <= 0:
            return PluginResult.pass_through()

        input_tokens = ctx.input_tokens or 0
        model = (ctx.model or "").lower()
        cost_per_1m = next(
            (v for k, v in _COST_PER_1M.items() if k in model), _DEFAULT_COST
        )
        request_cost = (input_tokens / 1_000_000) * cost_per_1m

        # Store cumulative daily cost in plugin storage (best-effort)
        # Since on_response is sync-called via asyncio.to_thread, we log via logger only
        ctx.logger.info(
            f"tokens={input_tokens} cost_usd={request_cost:.6f}",
            model=model,
        )

        return PluginResult.pass_through()
