from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["community"])


class CommunityRoom:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()
        self.messages: list[dict[str, Any]] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.add(websocket)
        await websocket.send_json({"type": "history", "messages": self.messages})

    def disconnect(self, websocket: WebSocket) -> None:
        self.connections.discard(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        stale_connections = []
        for connection in self.connections:
            try:
                await connection.send_json({"type": "message", "message": message})
            except Exception:
                stale_connections.append(connection)
        for connection in stale_connections:
            self.disconnect(connection)


room = CommunityRoom()


@router.websocket("/ws/community")
async def community_socket(websocket: WebSocket) -> None:
    await room.connect(websocket)
    try:
        while True:
            payload = await websocket.receive_json()
            username = str(payload.get("username") or "Neighbor").strip()[:24]
            text = str(payload.get("text") or "").strip()[:500]
            if not text:
                continue

            message = {
                "id": str(uuid4()),
                "username": username or "Neighbor",
                "text": text,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            room.messages.append(message)
            room.messages = room.messages[-50:]
            await room.broadcast(message)
    except WebSocketDisconnect:
        room.disconnect(websocket)