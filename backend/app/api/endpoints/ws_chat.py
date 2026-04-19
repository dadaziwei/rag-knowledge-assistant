import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.core.security import decode_access_token
from app.db.redis import redis
from app.models.conversation import UserMessage
from app.rag.llm_service import ChatService

router = APIRouter()


async def _authenticate_websocket(token: str | None):
    if not token:
        return None
    redis_connection = await redis.get_token_connection()
    if await redis_connection.get(f"token:{token}") is None:
        return None
    return decode_access_token(token)


async def _send_stream_chunk(websocket: WebSocket, chunk: str) -> None:
    for line in chunk.splitlines():
        if not line.startswith("data:"):
            continue
        payload = line.removeprefix("data:").strip()
        if not payload:
            continue
        try:
            await websocket.send_json(json.loads(payload))
        except json.JSONDecodeError:
            await websocket.send_json({"type": "text", "data": payload})


@router.websocket("/chat")
async def websocket_chat(websocket: WebSocket):
    token = websocket.query_params.get("token")
    token_data = await _authenticate_websocket(token)
    if not token_data:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            user_message = UserMessage(**payload)
            username = user_message.conversation_id.split("_")[0]
            if username != token_data.username:
                await websocket.send_json(
                    {"type": "error", "data": "Username mismatch"}
                )
                continue

            message_id = payload.get("message_id") or str(uuid.uuid4())
            await websocket.send_json(
                {"type": "start", "message_id": message_id, "conversation_id": user_message.conversation_id}
            )
            async for chunk in ChatService.create_chat_stream(user_message, message_id):
                await _send_stream_chunk(websocket, chunk)
            await websocket.send_json({"type": "done", "message_id": message_id})
    except WebSocketDisconnect:
        return
