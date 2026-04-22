class AgentWallError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 500):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AgentWallError):
    def __init__(self, resource: str):
        super().__init__("NOT_FOUND", f"{resource} not found", 404)


class ValidationError(AgentWallError):
    def __init__(self, message: str):
        super().__init__("VALIDATION_ERROR", message, 400)


class PluginContractError(AgentWallError):
    def __init__(self, plugin_id: str, message: str):
        super().__init__("PLUGIN_CONTRACT_ERROR", f"Plugin {plugin_id}: {message}", 422)


class PluginTimeoutError(AgentWallError):
    def __init__(self, plugin_id: str, timeout_ms: int):
        super().__init__("PLUGIN_TIMEOUT", f"Plugin {plugin_id} exceeded {timeout_ms}ms", 200)
