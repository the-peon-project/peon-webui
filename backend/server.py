"""
PEON Dashboard - Backend Server
A modular FastAPI application for managing game servers.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import aiohttp
import json
import logging
from datetime import datetime, timezone

# Core imports
from core.config import setup_logging, CORS_ORIGINS, SYNC_INTERVAL
from core.database import init_db, get_db, dict_from_row
from core.security import decode_token
from core.websocket import chat_manager
from core.orchestrator_url import resolve_orchestrator_url, resolve_orchestrator_url_candidates
from services.test_seed import ensure_test_users
from services.game_logos import resolve_logo_path

# Routes
from routes import api_router

# Setup logging to stdout
setup_logging()
logger = logging.getLogger(__name__)

# Background sync task
async def sync_orchestrator_servers():
    """Background task to sync server states from all orchestrators"""
    while True:
        try:
            await asyncio.sleep(SYNC_INTERVAL)
            
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM orchestrators WHERE is_active = 1")
            orchestrators = cursor.fetchall()
            conn.close()
            
            async with aiohttp.ClientSession() as session:
                for orch in orchestrators:
                    try:
                        orch_dict = dict_from_row(orch)
                        headers = {"X-Api-Key": orch_dict['api_key']}
                        for base_url in resolve_orchestrator_url_candidates(orch_dict['base_url']):
                            url = f"{base_url}/api/v1/servers"

                            try:
                                async with session.get(url, headers=headers, timeout=30) as response:
                                    if response.status == 200:
                                        servers = await response.json()

                                        conn = get_db()
                                        cursor = conn.cursor()

                                        # Clear old cache
                                        cursor.execute("DELETE FROM cached_servers WHERE orchestrator_id = ?",
                                                     (orch_dict['id'],))

                                        # Insert new cache
                                        for server in servers:
                                            server_id = f"{orch_dict['id']}_{server.get('game_uid', '')}_{server.get('servername', '')}"
                                            cursor.execute(
                                                "INSERT INTO cached_servers (id, orchestrator_id, server_data, synced_at) VALUES (?, ?, ?, ?)",
                                                (server_id, orch_dict['id'], json.dumps(server), datetime.now(timezone.utc).isoformat())
                                            )

                                        cursor.execute(
                                            "UPDATE orchestrators SET last_synced = ? WHERE id = ?",
                                            (datetime.now(timezone.utc).isoformat(), orch_dict['id'])
                                        )

                                        conn.commit()
                                        conn.close()

                                        logger.info(f"Synced {len(servers)} servers from {orch_dict['name']}")
                                        break
                            except (asyncio.TimeoutError, aiohttp.ClientError):
                                continue
                    except Exception as e:
                        logger.error(f"Failed to sync orchestrator {orch_dict['name']}: {e}")
        except Exception as e:
            logger.error(f"Error in sync task: {e}")

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    init_db()
    ensure_test_users()
    logger.info("Database initialized")
    
    # Start background sync task
    task = asyncio.create_task(sync_orchestrator_servers())
    logger.info("Background sync task started")
    
    yield
    
    # Shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    logger.info("Background sync task stopped")

# Create the main app
app = FastAPI(
    title="PEON Dashboard API",
    description="API for managing game servers via PEON orchestrators",
    version="1.0.0",
    lifespan=lifespan
)

# Include API routes
app.include_router(api_router)

_LOGO_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".gif": "image/gif",
}


@app.get("/game-logos/{logo_name:path}", include_in_schema=False)
async def get_game_logo(logo_name: str):
    """Serve game logos with automatic format/source resolution."""
    if "/" in logo_name or ".." in logo_name:
        raise HTTPException(status_code=400, detail="Invalid logo path")

    if "." in logo_name:
        game_uid, requested_ext = logo_name.rsplit(".", 1)
    else:
        game_uid, requested_ext = logo_name, None

    logo_path = resolve_logo_path(game_uid, requested_ext)
    if not logo_path:
        raise HTTPException(status_code=404, detail="Logo not found")

    return FileResponse(
        path=str(logo_path),
        media_type=_LOGO_MEDIA_TYPES.get(logo_path.suffix.lower(), "application/octet-stream"),
    )

# WebSocket endpoint for real-time chat
@app.websocket("/api/ws/chat")
async def websocket_chat(websocket: WebSocket, token: str = Query(...)):
    """WebSocket endpoint for real-time chat"""
    # Validate token
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
        
        # Get user info
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, role, is_chat_banned FROM users WHERE id = ?", (user_id,))
        user_row = cursor.fetchone()
        conn.close()
        
        if not user_row:
            await websocket.close(code=4001, reason="User not found")
            return
        
        user = dict_from_row(user_row)
        
        if user.get('is_chat_banned'):
            await websocket.close(code=4003, reason="Banned from chat")
            return
        
    except Exception as e:
        logger.error(f"WebSocket auth error: {e}")
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    await chat_manager.connect(websocket, user_id)
    
    # Broadcast user online
    await chat_manager.broadcast({
        "type": "user_online",
        "user": {"id": user_id, "username": user['username']}
    })
    
    try:
        # Send chat history on connect
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.id, m.message, m.created_at, u.id as user_id, u.username
            FROM chat_messages m
            JOIN users u ON m.user_id = u.id
            ORDER BY m.created_at DESC
            LIMIT 50
        """)
        messages = [dict_from_row(row) for row in cursor.fetchall()]
        conn.close()
        
        await websocket.send_json({
            "type": "chat_history",
            "messages": list(reversed(messages))
        })
        
        # Listen for incoming messages
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "chat_message":
                message = data.get("message", "").strip()
                if message and len(message) <= 1000:
                    # Save to database
                    conn = get_db()
                    cursor = conn.cursor()
                    
                    import uuid
                    msg_id = str(uuid.uuid4())
                    now = datetime.now(timezone.utc).isoformat()
                    
                    cursor.execute(
                        "INSERT INTO chat_messages (id, user_id, message, created_at) VALUES (?, ?, ?, ?)",
                        (msg_id, user_id, message, now)
                    )
                    conn.commit()
                    conn.close()
                    
                    # Broadcast to all clients
                    await chat_manager.broadcast({
                        "type": "chat_message",
                        "message": {
                            "id": msg_id,
                            "message": message,
                            "created_at": now,
                            "user_id": user_id,
                            "username": user['username']
                        }
                    })
                    
    except WebSocketDisconnect:
        chat_manager.disconnect(user_id)
        # Broadcast user offline
        await chat_manager.broadcast({
            "type": "user_offline",
            "user_id": user_id
        })
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        chat_manager.disconnect(user_id)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
