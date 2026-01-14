"""
Server Console Streaming API
Real-time console log streaming for game servers
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import Optional
import asyncio
import aiohttp
import json

from core.database import get_db
from core.security import get_current_user, get_current_admin_user, decode_token
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
        async with aiohttp.ClientSession() as session:
            headers = {"X-Api-Key": orch['api_key']}
            # Try to get logs from orchestrator
            url = f"{orch['base_url']}/api/v1/server/logs/{server_uid}?lines={lines}"
            
            async with session.get(url, headers=headers, timeout=30) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "logs": data.get('logs', []),
                        "server_uid": server_uid,
                        "lines": lines
                    }
                else:
                    # Fallback: Return mock logs if endpoint doesn't exist
                    return {
                        "logs": [
                            f"[INFO] Server {server_uid} console logs",
                            "[INFO] Logs streaming is available when the orchestrator supports it",
                            "[INFO] Contact your orchestrator administrator to enable this feature"
                        ],
                        "server_uid": server_uid,
                        "lines": lines,
                        "note": "Live logs require orchestrator v2.0+ with logs endpoint"
                    }
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Request timeout")
    except Exception as e:
        # Return helpful message instead of error
        return {
            "logs": [
                f"[WARNING] Could not fetch logs: {str(e)}",
                "[INFO] This may be due to orchestrator configuration"
            ],
            "server_uid": server_uid,
            "error": str(e)
        }


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
        orch_ws_url = f"{orch['base_url'].replace('http', 'ws')}/api/v1/ws/console/{server_uid}"
        
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
                        url = f"{orch['base_url']}/api/v1/server/logs/{server_uid}?lines=50"
                        
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
