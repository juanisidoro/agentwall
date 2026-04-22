"""T032 — Token Counter plugin tests."""
from __future__ import annotations
import pytest
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../proxy"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from unittest.mock import MagicMock


def _make_request_ctx(estimated_tokens: int, config: dict):
    from core.context import RequestContext
    ctx = MagicMock(spec=RequestContext)
    ctx.estimated_tokens = estimated_tokens
    ctx.config = config
    ctx.logger = MagicMock()
    return ctx


def _make_response_ctx(input_tokens: int, model: str, config: dict):
    from core.context import ResponseContext
    ctx = MagicMock(spec=ResponseContext)
    ctx.input_tokens = input_tokens
    ctx.output_tokens = 0
    ctx.model = model
    ctx.config = config
    ctx.logger = MagicMock()
    return ctx


def _plugin():
    from plugins.token_counter.plugin import Plugin
    return Plugin()


def test_blocks_when_over_limit():
    ctx = _make_request_ctx(500, {"max_tokens_per_request": 100})
    result = _plugin().on_request(ctx)
    assert result.action == "block"
    assert "500" in result.reason
    assert "100" in result.reason


def test_passes_when_within_limit():
    ctx = _make_request_ctx(50, {"max_tokens_per_request": 100})
    result = _plugin().on_request(ctx)
    assert result.action == "pass"


def test_passes_when_limit_zero():
    ctx = _make_request_ctx(999999, {"max_tokens_per_request": 0})
    result = _plugin().on_request(ctx)
    assert result.action == "pass"


def test_passes_when_limit_not_set():
    ctx = _make_request_ctx(999999, {})
    result = _plugin().on_request(ctx)
    assert result.action == "pass"


def test_on_response_passes_when_budget_zero():
    ctx = _make_response_ctx(1000, "claude-3-5-sonnet", {"daily_budget_usd": 0})
    result = _plugin().on_response(ctx)
    assert result.action == "pass"


def test_on_response_logs_token_usage():
    ctx = _make_response_ctx(1000, "gpt-4o", {"daily_budget_usd": 10.0})
    _plugin().on_response(ctx)
    ctx.logger.info.assert_called_once()
    log_msg = ctx.logger.info.call_args[0][0]
    assert "tokens=1000" in log_msg


def test_blocks_at_exact_limit():
    ctx = _make_request_ctx(100, {"max_tokens_per_request": 100})
    result = _plugin().on_request(ctx)
    assert result.action == "pass"  # equal is allowed, only strictly over is blocked


def test_blocks_one_over_limit():
    ctx = _make_request_ctx(101, {"max_tokens_per_request": 100})
    result = _plugin().on_request(ctx)
    assert result.action == "block"
