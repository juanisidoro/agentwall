from __future__ import annotations
import asyncio
import pytest
import pytest_asyncio
from pathlib import Path

from db.database import init_db, close_db
from core.plugin_loader import PluginLoader


@pytest_asyncio.fixture
async def db(tmp_path: Path):
    db_path = str(tmp_path / "test.db")
    conn = await init_db(db_path)
    yield conn
    await close_db()


@pytest.fixture
def event_queue() -> asyncio.Queue:
    return asyncio.Queue(maxsize=100)


@pytest.fixture
def plugin_loader() -> PluginLoader:
    return PluginLoader()


MOCK_PLUGIN_CODE = """
def get_manifest():
    return {
        "contract_version": "1.0",
        "id": "test/mock-plugin",
        "name": "Mock Plugin",
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


@pytest.fixture
def mock_plugin_code() -> str:
    return MOCK_PLUGIN_CODE


@pytest_asyncio.fixture
async def mock_plugin(plugin_loader: PluginLoader, db):
    loaded = plugin_loader.load_from_code("test/mock-plugin", MOCK_PLUGIN_CODE)
    yield loaded
