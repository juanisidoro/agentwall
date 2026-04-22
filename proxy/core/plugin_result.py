from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal


@dataclass
class PluginResult:
    action: Literal["pass", "block", "mutate", "alert"]
    reason: str | None = None
    mutated_body: dict | None = None
    alert_payload: dict | None = None

    @staticmethod
    def pass_through() -> "PluginResult":
        return PluginResult(action="pass")

    @staticmethod
    def block(reason: str) -> "PluginResult":
        return PluginResult(action="block", reason=reason)

    @staticmethod
    def mutate(body: dict, reason: str) -> "PluginResult":
        return PluginResult(action="mutate", mutated_body=body, reason=reason)

    @staticmethod
    def alert(reason: str, payload: dict) -> "PluginResult":
        return PluginResult(action="alert", reason=reason, alert_payload=payload)
