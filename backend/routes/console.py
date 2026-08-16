"""
Server Console Streaming API
Real-time console log streaming for game servers
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
import asyncio
import aiohttp

from core.database import get_db
from core.security import get_current_user, decode_token
from core.orchestrator_url import resolve_orchestrator_url
from services.orchestrator import OrchestratorService

router = APIRouter(prefix="/console")


@router.get("/{orch_id}/{server_uid}/logs")
async def get_server_logs(
    orch_id: str,
    server_uid: str,
    lines: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get server console logs (non-streaming)"""
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied")
    
    orch = OrchestratorService.get_by_id(orch_id)
    if not orch:
        raise HTTPException(status_code=404, detail="Orchestrator not found")
    
    try:
        timeout = aiohttp.ClientTimeout(total=30, connect=10, sock_read=20)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            headers = {"X-Api-Key": orch['api_key']}
            base_url = resolve_orchestrator_url(orch['base_url'])
            url = f"{base_url}/api/v1/server/logs/{server_uid}?lines={lines}&session_only=true"
            
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "logs": data.get('logs', []),
                        "container_state": data.get('container_state'),
                        "session_only": data.get('session_only', True),
                        "server_uid": server_uid,
                        "lines": lines
                    }

                detail = await response.text()
                raise HTTPException(
                    status_code=response.status,
                    detail=f"Failed to fetch orchestrator logs: {detail or 'unknown error'}"
                )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Request timeout")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching logs: {str(e)}")


@router.websocket("/ws/{orch_id}/{server_uid}")
async def websocket_console(
    websocket: WebSocket,
    orch_id: str,
    server_uid: str
):
    """WebSocket endpoint for real-time console streaming"""
    await websocket.accept()
    
    # Authenticate via query param
    token = websocket.query_params.get('token')
    if not token:
        await websocket.send_json({"error": "Authentication required"})
        await websocket.close()
        return
    
    try:
        payload = decode_token(token)
        user_id = payload.get('sub')
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user_row = cursor.fetchone()
        conn.close()
        
        if not user_row:
            await websocket.send_json({"error": "Invalid user"})
            await websocket.close()
            return
            
        user = dict(user_row)
        
        if not OrchestratorService.check_user_access(user['id'], orch_id, user['role']):
            await websocket.send_json({"error": "Access denied"})
            await websocket.close()
            return
            
    except Exception as e:
        await websocket.send_json({"error": f"Authentication failed: {str(e)}"})
        await websocket.close()
        return
    
    orch = OrchestratorService.get_by_id(orch_id)
    if not orch:
        await websocket.send_json({"error": "Orchestrator not found"})
        await websocket.close()
        return
    
    # Send initial connection message
    await websocket.send_json({
        "type": "connected",
        "server_uid": server_uid,
        "message": "Console stream connected"
    })
    
    try:
        # Attempt to connect to orchestrator's WebSocket for logs
        base_url = resolve_orchestrator_url(orch['base_url'])
        orch_ws_url = f"{base_url.replace('http', 'ws')}/api/v1/ws/console/{server_uid}"
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.ws_connect(
                    orch_ws_url,
                    headers={"X-Api-Key": orch['api_key']},
                    timeout=10
                ) as orch_ws:
                    # Relay messages from orchestrator to client
                    async def relay_from_orch():
                        async for msg in orch_ws:
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                await websocket.send_text(msg.data)
                            elif msg.type == aiohttp.WSMsgType.ERROR:
                                break
                    
                    # Handle client messages
                    async def handle_client():
                        while True:
                            try:
                                data = await websocket.receive_text()
                                # Forward commands to orchestrator if supported
                                await orch_ws.send_str(data)
                            except WebSocketDisconnect:
                                break
                    
                    await asyncio.gather(relay_from_orch(), handle_client())
                    
            except Exception:
                # Orchestrator doesn't support WebSocket logs, use polling fallback
                await websocket.send_json({
                    "type": "info",
                    "message": "Real-time streaming not available, using polling mode"
                })
                
                # Poll for logs every 5 seconds
                last_log_count = 0
                while True:
                    try:
                        # Check if client is still connected
                        try:
                            await asyncio.wait_for(
                                websocket.receive_text(),
                                timeout=0.1
                            )
                        except asyncio.TimeoutError:
                            pass
                        except WebSocketDisconnect:
                            break
                        
                        # Fetch logs
                        headers = {"X-Api-Key": orch['api_key']}
                        url = f"{base_url}/api/v1/server/logs/{server_uid}?lines=50&session_only=true"
                        
                        async with session.get(url, headers=headers, timeout=10) as response:
                            if response.status == 200:
                                data = await response.json()
                                logs = data.get('logs', [])
                                
                                if len(logs) > last_log_count:
                                    # Send only new logs
                                    new_logs = logs[last_log_count:] if last_log_count > 0 else logs[-20:]
                                    for log in new_logs:
                                        await websocket.send_json({
                                            "type": "log",
                                            "data": log
                                        })
                                    last_log_count = len(logs)
                        
                        await asyncio.sleep(5)
                        
                    except WebSocketDisconnect:
                        break
                    except Exception as e:
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Log fetch error: {str(e)}"
                        })
                        await asyncio.sleep(10)
                        
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
