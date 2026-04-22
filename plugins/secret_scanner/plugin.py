"""Secret Scanner plugin — detects and acts on secrets in LLM requests."""
from __future__ import annotations
import re
import copy

from core.context import RequestContext
from core.plugin_result import PluginResult

PATTERNS: list[tuple[str, str, re.Pattern]] = [
    ("ANTHROPIC_API_KEY", r"sk-ant-[a-zA-Z0-9_\-]{20,}", re.compile(r"sk-ant-[a-zA-Z0-9_\-]{20,}")),
    ("OPENAI_API_KEY", r"sk-[a-zA-Z0-9_\-]{20,}", re.compile(r"sk-[a-zA-Z0-9_\-]{20,}")),
    ("AWS_ACCESS_KEY", r"AKIA[A-Z0-9]{16}", re.compile(r"AKIA[A-Z0-9]{16}")),
    ("GITHUB_TOKEN", r"gh[pousr]_[A-Za-z0-9_]{20,}", re.compile(r"gh[pousr]_[A-Za-z0-9_]{20,}")),
    ("STRIPE_SECRET_KEY", r"sk_(live|test)_[a-zA-Z0-9]{10,}", re.compile(r"sk_(live|test)_[a-zA-Z0-9]{10,}")),
    ("SENDGRID_API_KEY", r"SG\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{10,}", re.compile(r"SG\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{10,}")),
    ("DB_CONNECTION_STRING", r"[a-z]+://[^:@\s]+:[^@\s]+@[^\s/]+/\w+", re.compile(r"[a-z]+://[^:@\s]+:[^@\s]+@[^\s/]+/\w+")),
    ("GENERIC_SECRET", r'(?i)(secret[_\-]?key|api[_\-]?key|password|secret)\s*[=:]\s*["\']?[^\s"\']{8,}["\']?', re.compile(r'(?i)(secret[_\-]?key|api[_\-]?key|password|secret)\s*[=:]\s*["\']?[^\s"\']{8,}["\']?')),
]


def get_manifest() -> dict:
    return {
        "contract_version": "1.0",
        "id": "agentwall/secret-scanner",
        "name": "Secret Scanner",
        "version": "1.0.0",
        "description": "Detects and redacts API keys and credentials before they leave the network.",
        "runtime": "python",
        "hooks": ["onRequest"],
        "timeout_ms": 200,
        "on_error": "pass",
        "config_schema": {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["redact", "block", "alert"],
                    "default": "redact",
                    "description": "Action to take when a secret is detected.",
                },
                "scan_system_prompt": {
                    "type": "boolean",
                    "default": True,
                    "description": "Whether to scan the system prompt field.",
                },
                "custom_patterns": {
                    "type": "array",
                    "items": {"type": "string"},
                    "default": [],
                    "description": "Additional regex patterns to detect.",
                },
            },
        },
    }


class Plugin:
    def on_request(self, ctx: RequestContext) -> PluginResult:
        if ctx.body_parsed is None:
            return PluginResult.pass_through()

        action = ctx.config.get("action", "redact")
        scan_system = ctx.config.get("scan_system_prompt", True)
        custom_raw = ctx.config.get("custom_patterns", [])

        patterns = list(PATTERNS)
        for raw in custom_raw:
            try:
                patterns.append(("CUSTOM", raw, re.compile(raw)))
            except re.error:
                pass

        findings: list[tuple[str, str]] = []
        body = ctx.body_parsed

        # Scan messages
        messages = body.get("messages") or []
        for msg in messages:
            content = msg.get("content", "")
            if isinstance(content, str):
                for label, _, pattern in patterns:
                    if pattern.search(content):
                        findings.append((label, content))

        # Scan system prompt
        system = body.get("system", "")
        if scan_system and isinstance(system, str):
            for label, _, pattern in patterns:
                if pattern.search(system):
                    findings.append((label, system))

        if not findings:
            return PluginResult.pass_through()

        detected_labels = list({f[0] for f in findings})

        if action == "block":
            return PluginResult.block(
                f"Secrets detected: {', '.join(detected_labels)}"
            )

        if action == "alert":
            return PluginResult.alert(
                reason=f"Secrets detected: {', '.join(detected_labels)}",
                payload={"detected": detected_labels},
            )

        # redact (default)
        mutated = _redact_body(body, patterns, scan_system)
        return PluginResult.mutate(
            body=mutated,
            reason=f"Redacted secrets: {', '.join(detected_labels)}",
        )


def _redact_body(body: dict, patterns: list, scan_system: bool) -> dict:
    mutated = copy.deepcopy(body)

    messages = mutated.get("messages") or []
    for msg in messages:
        if isinstance(msg.get("content"), str):
            msg["content"] = _redact_text(msg["content"], patterns)

    if scan_system and isinstance(mutated.get("system"), str):
        mutated["system"] = _redact_text(mutated["system"], patterns)

    return mutated


def _redact_text(text: str, patterns: list) -> str:
    for label, _, pattern in patterns:
        text = pattern.sub(f"[REDACTED:{label}]", text)
    return text
