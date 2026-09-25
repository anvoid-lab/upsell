import json
from pathlib import Path
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from workflows import orchestrator


class ChatRequest(BaseModel):
    message: str


WEB_DIR = Path("app") / "web"

app = FastAPI()
orch = orchestrator.Orchestrator()


@app.get("/", response_class=FileResponse)
async def index() -> FileResponse:
    return WEB_DIR / "index.html"  # pyright: ignore[reportReturnType]


@app.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:

    async def generator() -> AsyncIterator[str]:
        async for event in orch.stream(request.message):
            yield json.dumps(event, ensure_ascii=False) + "\n"

    return StreamingResponse(
        generator(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
