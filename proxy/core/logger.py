from __future__ import annotations
import logging

_root = logging.getLogger("agentwall")


class PluginLogger:
    """Structured logger scoped to a plugin_id and request_id."""

    def __init__(self, plugin_id: str, request_id: str | None = None) -> None:
        self._plugin_id = plugin_id
        self._request_id = request_id
        self._logger = _root.getChild(plugin_id)

    def _extra(self) -> dict:
        return {"plugin_id": self._plugin_id, "request_id": self._request_id}

    def debug(self, msg: str, **kwargs: object) -> None:
        self._logger.debug(msg, extra={**self._extra(), **kwargs})

    def info(self, msg: str, **kwargs: object) -> None:
        self._logger.info(msg, extra={**self._extra(), **kwargs})

    def warning(self, msg: str, **kwargs: object) -> None:
        self._logger.warning(msg, extra={**self._extra(), **kwargs})

    def error(self, msg: str, **kwargs: object) -> None:
        self._logger.error(msg, extra={**self._extra(), **kwargs})

    def for_request(self, request_id: str) -> "PluginLogger":
        return PluginLogger(self._plugin_id, request_id)
