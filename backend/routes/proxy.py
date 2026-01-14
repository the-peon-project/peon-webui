from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any, Optional
import json
import os
import asyncio
import aiohttp
from datetime import datetime, timezone
from pydantic import BaseModel

from core.database import get_db, dict_from_row
from core.security import get_current_user, get_current_admin_user
from services.orchestrator import OrchestratorService
from services.audit import AuditService

router = APIRouter(prefix="/proxy")

class DeployServerRequest(BaseModel):
    game_uid: str
    server_name: str
    environment: Dict[str, Any] = {}

class UpdateServerRequest(BaseModel):
    mode: str = "full"  # full, quick, etc.

@router.get("/plans")
async def get_plans(current_user: dict = Depends(get_current_user)):
    """Get all available game plans from local warplans"""
    plans = []
    warplans_dir = "/app/peon-warplans"
    
    if os.path.exists(warplans_dir):
        for item in os.listdir(warplans_dir):
            plan_file = os.path.join(warplans_dir, item, "plan.json")
            if os.path.isfile(plan_file):
                try:
                    with open(plan_file, 'r') as f:
                        plan_data = json.load(f)
                        plan_data['game_uid'] = item
                        plans.append(plan_data)
                except Exception:
                    pass
    
    return plans

@router.get("/{orch_id}/servers")
async def get_servers(orch_id: str, current_user: dict = Depends(get_current_user)):
    """Get servers from specific orchestrator (live fetch)"""
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied to this orchestrator")
    
    orch = OrchestratorService.get_by_id(orch_id)
    if not orch or not orch.get('is_active'):
        raise HTTPException(status_code=404, detail="Orchestrator not found or inactive")
    
    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-Api-Key": orch['api_key']}
            url = f"{orch['base_url']}/api/v1/servers"
            
            async with session.get(url, headers=headers, timeout=30) as response:
                if response.status == 200:
                    servers = await response.json()
                    
                    # Filter servers for non-admin users
                    if current_user['role'] != 'admin':
                        allowed_servers = OrchestratorService.get_user_server_links(current_user['id'], orch_id)
                        if allowed_servers:  # If user has specific server links, filter
                            servers = [s for s in servers if f"{s.get('game_uid')}.{s.get('servername')}" in allowed_servers]
                    
                    # Update cache
                    conn = get_db()
                    cursor = conn.cursor()
                    now = datetime.now(timezone.utc).isoformat()
                    
                    cursor.execute("DELETE FROM cached_servers WHERE orchestrator_id = ?", (orch_id,))
                    for server in servers:
                        server_id = f"{orch_id}_{server.get('game_uid', '')}_{server.get('servername', '')}"
                        cursor.execute(
                            "INSERT INTO cached_servers (id, orchestrator_id, server_data, synced_at) VALUES (?, ?, ?, ?)",
                            (server_id, orch_id, json.dumps(server), now)
                        )
                    cursor.execute("UPDATE orchestrators SET last_synced = ? WHERE id = ?", (now, orch_id))
                    conn.commit()
                    conn.close()
                    
                    return {"servers": servers, "last_synced": now}
                else:
                    raise HTTPException(status_code=response.status, detail="Failed to fetch servers")
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Orchestrator request timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching servers: {str(e)}")

@router.get("/{orch_id}/server/info/{server_uid}")
async def get_server_info(orch_id: str, server_uid: str, current_user: dict = Depends(get_current_user)):
    """Get detailed server information"""
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied")
    
    orch = OrchestratorService.get_by_id(orch_id)
    if not orch:
        raise HTTPException(status_code=404, detail="Orchestrator not found")
    
    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-Api-Key": orch['api_key']}
            url = f"{orch['base_url']}/api/v1/server/get/{server_uid}"
            
            async with session.get(url, headers=headers, timeout=30) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise HTTPException(status_code=response.status, detail="Failed to get server info")
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Request timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/{orch_id}/server/stats/{server_uid}")
async def get_server_stats(orch_id: str, server_uid: str, current_user: dict = Depends(get_current_user)):
    """Get server resource stats"""
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied")
    
    orch = OrchestratorService.get_by_id(orch_id)
    if not orch:
        raise HTTPException(status_code=404, detail="Orchestrator not found")
    
    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-Api-Key": orch['api_key']}
            
            # Try stats endpoint first
            stats_url = f"{orch['base_url']}/api/v1/server/stats/{server_uid}"
            async with session.get(stats_url, headers=headers, timeout=10) as response:
                if response.status == 200:
                    return await response.json()
            
            # Fallback to info endpoint
            info_url = f"{orch['base_url']}/api/v1/server/get/{server_uid}"
            async with session.get(info_url, headers=headers, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    stats = {}
                    if data.get('time'):
                        stats['uptime'] = data['time']
                    config = data.get('server_config', {})
                    if 'players' in config:
                        stats['players'] = config['players']
                    if 'max_players' in config:
                        stats['max_players'] = config['max_players']
                    stats['health'] = 'healthy' if data.get('container_state') == 'running' else 'stopped'
                    return stats if stats else {"message": "Stats not available"}
            
            return {"message": "Stats not available"}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Stats request timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")

@router.post("/{orch_id}/deploy")
async def deploy_server(
    orch_id: str,
    deploy_data: DeployServerRequest,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Deploy a new server"""
    orch = OrchestratorService.get_by_id(orch_id)
    if not orch:
        raise HTTPException(status_code=404, detail="Orchestrator not found")
    
    deploy_payload = {
        "game_uid": deploy_data.game_uid,
        "servername": deploy_data.server_name,
        **deploy_data.environment
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-Api-Key": orch['api_key'], "Content-Type": "application/json"}
            url = f"{orch['base_url']}/api/v1/server/create"
            
            async with session.post(url, headers=headers, json=deploy_payload, timeout=60) as response:
                result = await response.json()
                
                if response.status in [200, 201]:
                    # Log deployment
                    AuditService.log(
                        user_id=current_user['id'],
                        username=current_user['username'],
                        action_type='create',
                        category='server',
                        target_type='server',
                        target_id=deploy_data.server_name,
                        details=f"Deployed server: {deploy_data.game_uid}.{deploy_data.server_name}",
                        ip_address=request.client.host if request.client else None
                    )
                    return {"success": True, "message": "Server deployment initiated", "data": result}
                else:
                    raise HTTPException(status_code=response.status, detail=result.get('detail', 'Deploy failed'))
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Deployment request timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deployment error: {str(e)}")

@router.put("/{orch_id}/server/{action}/{server_uid}")
async def server_action(
    orch_id: str,
    action: str,
    server_uid: str,
    request: Request,
    update_data: Optional[UpdateServerRequest] = None,
    current_user: dict = Depends(get_current_user)
):
    """Execute server action (start, stop, restart, update)"""
    # Require admin for server control actions
    is_control_action = action in ['start', 'stop', 'restart', 'update', 'create', 'delete']
    if is_control_action and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Server control requires admin access")
    
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied")
    
    orch = OrchestratorService.get_by_id(orch_id)
    if not orch:
        raise HTTPException(status_code=404, detail="Orchestrator not found")
    
    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-Api-Key": orch['api_key']}
            url = f"{orch['base_url']}/api/v1/server/{action}/{server_uid}"
            
            # Add update mode if applicable
            body = None
            if action == 'update' and update_data:
                body = {"mode": update_data.mode}
            
            async with session.put(url, headers=headers, json=body, timeout=30) as response:
                try:
                    result = await response.json()
                except Exception:
                    result = {"result": await response.text()}
                
                if response.status == 200:
                    # Log server action
                    AuditService.log(
                        user_id=current_user['id'],
                        username=current_user['username'],
                        action_type='action',
                        category='server',
                        target_type='server',
                        target_id=server_uid,
                        details=f"Executed {action} on server: {server_uid}",
                        ip_address=request.client.host if request.client else None
                    )
                    return result
                else:
                    raise HTTPException(status_code=response.status, detail=result.get('info', 'Action failed'))
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Request timeout")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Action error: {str(e)}")

@router.api_route("/{orch_id}/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_orchestrator(
    orch_id: str,
    path: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Generic proxy endpoint for orchestrator API"""
    is_server_action = any(action in path for action in ['start', 'stop', 'restart', 'update', 'create', 'delete'])
    if is_server_action and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Server control requires admin access")
    
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied")
    
    orch = OrchestratorService.get_by_id(orch_id)
    if not orch:
        raise HTTPException(status_code=404, detail="Orchestrator not found")
    
    url = f"{orch['base_url']}/api/v1/{path}"
    headers = {"X-Api-Key": orch['api_key']}
    
    async with aiohttp.ClientSession() as session:
        try:
            body = None
            if request.method in ["POST", "PUT"]:
                try:
                    body = await request.json()
                except Exception:
                    pass
            
            async with session.request(
                method=request.method,
                url=url,
                headers=headers,
                json=body if body else None,
                timeout=30
            ) as response:
                try:
                    return await response.json()
                except Exception:
                    return {"result": await response.text()}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")
