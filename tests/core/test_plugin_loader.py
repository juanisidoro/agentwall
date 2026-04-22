"""T033 — PluginLoader contract validation tests."""
from __future__ import annotations
import pytest
import sys, os
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../proxy"))

from core.plugin_loader import PluginLoader
from core.errors import PluginContractError


VALID_CODE = """
def get_manifest():
    return {
        "contract_version": "1.0",
        "id": "test/valid",
        "name": "Valid Plugin",
        "version": "1.0.0",
        "runtime": "python",
        "hooks": ["onRequest"],
        "config_schema": {},
    }

class Plugin:
    def on_request(self, ctx):
        from core.plugin_result import PluginResult
        return PluginResult.pass_through()
"""


def loader():
    return PluginLoader()


def test_load_valid_plugin():
    loaded = loader().load_from_code("test/valid", VALID_CODE)
    assert loaded.plugin_id == "test/valid"
    assert loaded.hooks == ["onRequest"]


def test_reject_missing_get_manifest():
    code = "class Plugin:\n    pass\n"
    with pytest.raises(PluginContractError, match="get_manifest"):
        loader().load_from_code("test/bad", code)


def test_reject_wrong_contract_version():
    code = VALID_CODE.replace('"contract_version": "1.0"', '"contract_version": "2.0"')
    with pytest.raises(PluginContractError, match="contract_version"):
        loader().load_from_code("test/bad", code)


def test_reject_missing_required_field():
    code = VALID_CODE.replace('"runtime": "python",', "")
    with pytest.raises(PluginContractError, match="missing required keys"):
        loader().load_from_code("test/bad", code)


def test_reject_missing_plugin_class():
    code = VALID_CODE.replace("class Plugin:", "class NotPlugin:")
    with pytest.raises(PluginContractError, match="Plugin class"):
        loader().load_from_code("test/bad", code)


def test_reject_invalid_hook_name():
    code = VALID_CODE.replace('"hooks": ["onRequest"]', '"hooks": ["onInvalidHook"]')
    with pytest.raises(PluginContractError, match="unknown hooks"):
        loader().load_from_code("test/bad", code)


def test_reload_replaces_existing(tmp_path: Path):
    reload_code = VALID_CODE.replace('"id": "test/valid"', '"id": "test/reload"')
    ldr = loader()
    ldr.load_from_code("test/reload", reload_code)
    assert ldr.get("test/reload") is not None

    # Write updated version to a file and reload from path
    plugin_file = tmp_path / "plugin.py"
    plugin_file.write_text(reload_code.replace('"version": "1.0.0"', '"version": "1.0.1"'))

    loaded2 = ldr.reload("test/reload", plugin_file)
    assert loaded2 is not None
    assert loaded2.manifest["version"] == "1.0.1"


def test_unload_removes_plugin():
    ldr = loader()
    ldr.load_from_code("test/remove", VALID_CODE)
    ldr.unload("test/remove")
    assert ldr.get("test/remove") is None


def test_get_manifest_raises_propagated():
    code = "def get_manifest():\n    raise ValueError('oops')\nclass Plugin: pass\n"
    with pytest.raises(PluginContractError, match="oops"):
        loader().load_from_code("test/bad", code)
