"""T028 — Secret Scanner plugin tests. Written BEFORE implementation (TDD)."""
from __future__ import annotations
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../proxy"))


def _make_ctx(body: dict | None, config: dict | None = None):
    from unittest.mock import MagicMock
    from core.context import RequestContext
    from core.storage import PluginStorage
    from core.logger import PluginLogger

    ctx = MagicMock(spec=RequestContext)
    ctx.body_parsed = body
    ctx.config = config or {"action": "redact"}
    ctx.storage = MagicMock()
    ctx.logger = MagicMock()
    ctx.messages = body.get("messages") if body else None
    return ctx


def _get_plugin(config: dict | None = None):
    from plugins.secret_scanner.plugin import Plugin
    plugin = Plugin()
    return plugin


def _run(body: dict | None, config: dict | None = None):
    ctx = _make_ctx(body, config)
    plugin = _get_plugin(config)
    return plugin.on_request(ctx)


# ── Pattern detection ────────────────────────────────────────────────────────

@pytest.mark.parametrize("secret,label", [
    ("sk-ant-api03-FAKEKEY1234567890abcdefghijklmnop", "ANTHROPIC_API_KEY"),
    ("sk-proj-FAKEOPENAIKEY1234567890abcdefghij", "OPENAI_API_KEY"),
    ("AKIAFAKEAWSACCESSKEY1234", "AWS_ACCESS_KEY"),
    ("ghp_FAKETOKEN1234567890abcdefghijk", "GITHUB_TOKEN"),
    ("sk_live_" + "FAKESTRIPE" + "KEY1234567890abcdef", "STRIPE_SECRET_KEY"),
    ("SG.FAKESENDGRIDKEY.1234567890abcdefghijklmnopqrstu", "SENDGRID_API_KEY"),
    ("postgresql://user:s3cr3tp@ss@host/db", "DB_CONNECTION_STRING"),
    ('SECRET_KEY="fakesecretvalue123"', "GENERIC_SECRET"),
])
def test_detects_pattern(secret, label):
    body = {"messages": [{"role": "user", "content": f"My key is {secret}"}]}
    result = _run(body, {"action": "redact"})
    assert result.action in ("mutate", "block", "alert"), f"Expected detection for {label}"


def test_redact_replaces_with_placeholder():
    secret = "sk-ant-api03-FAKEKEY1234567890abcdefghijklmnop"
    body = {"messages": [{"role": "user", "content": f"key={secret}"}]}
    result = _run(body, {"action": "redact"})
    assert result.action == "mutate"
    content = result.mutated_body["messages"][0]["content"]
    assert secret not in content
    assert "[REDACTED:" in content


def test_block_action_returns_block():
    secret = "sk-ant-api03-FAKEKEY1234567890abcdefghijklmnop"
    body = {"messages": [{"role": "user", "content": f"key={secret}"}]}
    result = _run(body, {"action": "block"})
    assert result.action == "block"
    assert result.reason is not None


def test_alert_action_returns_alert():
    secret = "sk-ant-api03-FAKEKEY1234567890abcdefghijklmnop"
    body = {"messages": [{"role": "user", "content": f"key={secret}"}]}
    result = _run(body, {"action": "alert"})
    assert result.action == "alert"
    assert result.alert_payload is not None


def test_no_secret_returns_pass():
    body = {"messages": [{"role": "user", "content": "Hello, how are you?"}]}
    result = _run(body, {"action": "redact"})
    assert result.action == "pass"


def test_body_parsed_none_returns_pass():
    result = _run(None, {"action": "redact"})
    assert result.action == "pass"


def test_system_prompt_scanned_when_enabled():
    secret = "sk-ant-api03-FAKEKEY1234567890abcdefghijklmnop"
    body = {
        "system": f"You have access to key={secret}",
        "messages": [{"role": "user", "content": "Hello"}],
    }
    result = _run(body, {"action": "redact", "scan_system_prompt": True})
    assert result.action == "mutate"


def test_system_prompt_skipped_when_disabled():
    secret = "sk-ant-api03-FAKEKEY1234567890abcdefghijklmnop"
    body = {
        "system": f"You have access to key={secret}",
        "messages": [{"role": "user", "content": "Hello"}],
    }
    result = _run(body, {"action": "redact", "scan_system_prompt": False})
    assert result.action == "pass"


def test_multiple_secrets_all_redacted():
    body = {
        "messages": [{
            "role": "user",
            "content": "key1=sk-ant-api03-FAKEKEY1234567890abcdefghijklmnop key2=AKIAFAKEAWSACCESSKEY1234",
        }]
    }
    result = _run(body, {"action": "redact"})
    assert result.action == "mutate"
    content = result.mutated_body["messages"][0]["content"]
    assert "sk-ant-api03" not in content
    assert "AKIA" not in content
