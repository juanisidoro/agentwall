from __future__ import annotations
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter()

MITMPROXY_CERT = Path.home() / ".mitmproxy" / "mitmproxy-ca-cert.pem"


@router.get("/cert")
async def get_cert() -> FileResponse:
    if not MITMPROXY_CERT.exists():
        from core.errors import NotFoundError
        raise NotFoundError("mitmproxy CA certificate")
    return FileResponse(
        path=str(MITMPROXY_CERT),
        media_type="application/x-pem-file",
        filename="agentwall-ca.pem",
    )
