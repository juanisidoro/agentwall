from __future__ import annotations
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.websockets import WebSocket

from core.errors import AgentWallError
from api.websocket import websocket_endpoint

DASHBOARD_DIR = Path(__file__).parent.parent.parent / "dashboard" / "dist"


def create_app() -> FastAPI:
    app = FastAPI(title="AgentWall", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AgentWallError)
    async def agentwall_error_handler(request: Request, exc: AgentWallError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.code, "message": exc.message},
        )

    from api import plugins, settings, logs, alerts, stats, cert

    app.include_router(plugins.router, prefix="/api")
    app.include_router(settings.router, prefix="/api")
    app.include_router(logs.router, prefix="/api")
    app.include_router(alerts.router, prefix="/api")
    app.include_router(stats.router, prefix="/api")
    app.include_router(cert.router, prefix="/api")

    app.add_api_websocket_route("/ws", websocket_endpoint)

    if DASHBOARD_DIR.exists():
        app.mount("/", StaticFiles(directory=str(DASHBOARD_DIR), html=True), name="dashboard")

    return app
