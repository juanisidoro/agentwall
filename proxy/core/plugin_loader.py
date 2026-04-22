from __future__ import annotations
import importlib.util
import sys
from pathlib import Path
from types import ModuleType

from core.errors import PluginContractError
from core.storage import PluginStorage
from core.logger import PluginLogger

SUPPORTED_CONTRACT_VERSION = "1.0"
REQUIRED_MANIFEST_KEYS = {"contract_version", "id", "name", "version", "runtime", "hooks", "config_schema"}


class LoadedPlugin:
    def __init__(self, manifest: dict, plugin_class: type, module: ModuleType) -> None:
        self.manifest = manifest
        self.plugin_class = plugin_class
        self.module = module
        self.plugin_id: str = manifest["id"]

    def instantiate(self, config: dict) -> object:
        return self.plugin_class()

    @property
    def timeout_ms(self) -> int:
        return self.manifest.get("timeout_ms", 100)

    @property
    def on_error(self) -> str:
        return self.manifest.get("on_error", "pass")

    @property
    def hooks(self) -> list[str]:
        return self.manifest.get("hooks", [])


class PluginLoader:
    def __init__(self) -> None:
        self._plugins: dict[str, LoadedPlugin] = {}

    def load_from_path(self, path: Path) -> LoadedPlugin:
        module = _load_module(path)
        return self._register(module, str(path))

    def load_from_code(self, plugin_id: str, code: str) -> LoadedPlugin:
        module = _load_module_from_code(plugin_id, code)
        return self._register(module, f"<inline:{plugin_id}>")

    def _register(self, module: ModuleType, source: str) -> LoadedPlugin:
        manifest = _extract_manifest(module, source)
        _validate_manifest(manifest, source)
        plugin_class = _extract_plugin_class(module, source)
        loaded = LoadedPlugin(manifest, plugin_class, module)
        self._plugins[manifest["id"]] = loaded
        return loaded

    def unload(self, plugin_id: str) -> None:
        self._plugins.pop(plugin_id, None)

    def reload(self, plugin_id: str, path: Path) -> LoadedPlugin:
        self.unload(plugin_id)
        return self.load_from_path(path)

    def get(self, plugin_id: str) -> LoadedPlugin | None:
        return self._plugins.get(plugin_id)

    def all(self) -> list[LoadedPlugin]:
        return list(self._plugins.values())


def _load_module(path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(f"_plugin_{path.stem}", path)
    if spec is None or spec.loader is None:
        raise PluginContractError(str(path), "cannot create module spec from path")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_module_from_code(plugin_id: str, code: str) -> ModuleType:
    safe_name = plugin_id.replace("/", "__").replace("-", "_")
    module_name = f"_plugin_inline_{safe_name}"
    module = ModuleType(module_name)
    exec(compile(code, f"<inline:{plugin_id}>", "exec"), module.__dict__)  # noqa: S102
    sys.modules[module_name] = module
    return module


def _extract_manifest(module: ModuleType, source: str) -> dict:
    get_manifest = getattr(module, "get_manifest", None)
    if not callable(get_manifest):
        raise PluginContractError(source, "missing get_manifest() function")
    try:
        manifest = get_manifest()
    except Exception as exc:
        raise PluginContractError(source, f"get_manifest() raised: {exc}") from exc
    if not isinstance(manifest, dict):
        raise PluginContractError(source, "get_manifest() must return a dict")
    return manifest


def _validate_manifest(manifest: dict, source: str) -> None:
    missing = REQUIRED_MANIFEST_KEYS - manifest.keys()
    if missing:
        raise PluginContractError(source, f"manifest missing required keys: {missing}")

    cv = manifest.get("contract_version")
    if cv != SUPPORTED_CONTRACT_VERSION:
        raise PluginContractError(
            source,
            f"unsupported contract_version '{cv}' (expected '{SUPPORTED_CONTRACT_VERSION}')",
        )

    if manifest.get("runtime") != "python":
        raise PluginContractError(source, "runtime must be 'python'")

    hooks = manifest.get("hooks", [])
    valid_hooks = {"onRequest", "onResponse"}
    invalid = set(hooks) - valid_hooks
    if invalid:
        raise PluginContractError(source, f"unknown hooks declared: {invalid}")


def _extract_plugin_class(module: ModuleType, source: str) -> type:
    plugin_class = getattr(module, "Plugin", None)
    if plugin_class is None or not isinstance(plugin_class, type):
        raise PluginContractError(source, "missing Plugin class")
    return plugin_class
