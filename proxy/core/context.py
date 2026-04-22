from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.storage import PluginStorage
    from core.logger import PluginLogger


@dataclass
class RequestContext:
    # Identity
    request_id: str
    timestamp: str
    agent_id: str

    # Destination
    url: str
    method: str
    destination: str
    provider: str  # "anthropic" | "openai" | "unknown"

    # Payload (in-memory only — never persisted)
    headers: dict
    body_raw: bytes
    body_parsed: dict | None

    # LLM-specific
    model: str | None
    messages: list | None
    estimated_tokens: int

    # Plugin runtime
    config: dict
    storage: "PluginStorage"
    logger: "PluginLogger"

    # Shared context between plugins in the same request
    shared: dict = field(default_factory=dict)


@dataclass
class ResponseContext:
    # Identity
    request_id: str
    timestamp: str
    agent_id: str
    provider: str
    model: str | None

    # Response
    status_code: int
    headers: dict
    body_raw: bytes
    body_parsed: dict | None

    # LLM-specific
    input_tokens: int | None
    output_tokens: int | None
    latency_ms: int

    # Plugin runtime
    config: dict
    storage: "PluginStorage"
    logger: "PluginLogger"
    shared: dict = field(default_factory=dict)


@dataclass
class ErrorContext:
    request_id: str
    plugin_id: str
    error: Exception
    phase: str  # "request" | "response"
