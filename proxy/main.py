from __future__ import annotations
import asyncio
import logging
import os
import sys

import uvicorn
from mitmproxy.tools.dump import DumpMaster
from mitmproxy.options import Options

from db.database import init_db, close_db
from core.plugin_loader import PluginLoader
from core.addon import AgentWallAddon
from api.router import create_app
from api.websocket import broadcast_loop
from api.settings import set_proxy_running

PROXY_HOST = os.getenv("AGENTWALL_PROXY_HOST", "0.0.0.0")
PROXY_PORT = int(os.getenv("AGENTWALL_PROXY_PORT", "8080"))
API_HOST = os.getenv("AGENTWALL_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("AGENTWALL_API_PORT", "9090"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger("agentwall")


async def run() -> None:
    await init_db()
    logger.info("Database initialized")

    event_queue: asyncio.Queue = asyncio.Queue(maxsize=1000)
    plugin_loader = PluginLoader()

    addon = AgentWallAddon(plugin_loader, event_queue)

    app = create_app()

    # Configure uvicorn server (no auto-start; we drive it manually)
    config = uvicorn.Config(app, host=API_HOST, port=API_PORT, loop="none", log_level="info")
    server = uvicorn.Server(config)

    # Configure mitmproxy in dump (non-interactive) mode
    options = Options(listen_host=PROXY_HOST, listen_port=PROXY_PORT)
    proxy_master = DumpMaster(options, with_termlog=False, with_dumper=False)
    proxy_master.addons.add(addon)

    logger.info("Starting proxy on %s:%d", PROXY_HOST, PROXY_PORT)
    logger.info("Starting API on %s:%d", API_HOST, API_PORT)

    set_proxy_running(True)

    try:
        await asyncio.gather(
            server.serve(),
            proxy_master.run(),
            broadcast_loop(event_queue),
        )
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("Shutting down…")
    finally:
        set_proxy_running(False)
        await close_db()


def main() -> None:
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()
