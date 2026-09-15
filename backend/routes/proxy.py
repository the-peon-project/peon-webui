from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import json
import os
import uuid
import asyncio
import aiohttp
from urllib.parse import quote_plus
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.database import get_db, dict_from_row
from core.security import get_current_user, get_current_admin_user, decode_token
from core.orchestrator_url import resolve_orchestrator_url, resolve_orchestrator_url_candidates
from services.orchestrator import OrchestratorService
from services.audit import AuditService
from services.game_logos import ensure_png_logo_for_game

router = APIRouter(prefix="/proxy")
docs_security = HTTPBearer(auto_error=False)

class DeployServerRequest(BaseModel):
    game_uid: str
    server_name: str
    environment: Dict[str, Any] = {}

class UpdateServerRequest(BaseModel):
    mode: str = "full"  # full, quick, etc.


class GrantServerAccessRequest(BaseModel):
    user_id: str
    permissions: str = "manage"


ALLOWED_SERVER_LINK_PERMISSIONS = {'read', 'manage', 'owner'}


def _humanize_game_uid(game_uid: str) -> str:
    uid = (game_uid or "").strip().replace("-", " ").replace("_", " ")
    if not uid:
        return "Unknown Game"
    if " " in uid:
        return " ".join(part.capitalize() for part in uid.split())
    return uid.capitalize()


def _read_plan_display_name(plan_dir: str, game_uid: str) -> str:
    readme_path = os.path.join(plan_dir, "README.md")
    try:
        with open(readme_path, "r", encoding="utf-8") as readme_file:
            for line in readme_file:
                stripped = line.strip()
                if stripped.startswith("# "):
                    heading = stripped[2:].strip()
                    if heading:
                        return heading
    except OSError:
        pass
    return _humanize_game_uid(game_uid)


def _resolve_docs_user(
    token: Optional[str],
    credentials: Optional[HTTPAuthorizationCredentials]
) -> dict:
    bearer_token = token or (credentials.credentials if credentials else None)
    if not bearer_token:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    payload = decode_token(bearer_token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return dict_from_row(user)


@router.get("/{orch_id}/openapi.json")
async def get_orchestrator_openapi(
    orch_id: str,
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(docs_security),
):
    """Return OpenAPI spec from a specific orchestrator."""
    current_user = _resolve_docs_user(token, credentials)
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied")

    orch = OrchestratorService.get_by_id(orch_id)
    if not orch or not orch.get('is_active'):
        raise HTTPException(status_code=404, detail="Orchestrator not found or inactive")

    timeout = aiohttp.ClientTimeout(total=30, connect=10, sock_read=20)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        headers = {"X-Api-Key": orch['api_key']}
        last_error = None

        for base_url in resolve_orchestrator_url_candidates(orch['base_url']):
            url = f"{base_url}/openapi.json"
            try:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        payload = await response.json()
                        return JSONResponse(content=payload)
                    last_error = HTTPException(status_code=response.status, detail="Failed to fetch OpenAPI spec")
            except (asyncio.TimeoutError, aiohttp.ClientError) as exc:
                last_error = exc
                continue

        if isinstance(last_error, HTTPException):
            raise last_error
        if isinstance(last_error, asyncio.TimeoutError):
            raise HTTPException(status_code=504, detail="Orchestrator request timeout")
        raise HTTPException(status_code=500, detail="Unable to retrieve orchestrator OpenAPI spec")


@router.get("/{orch_id}/docs", include_in_schema=False)
async def get_orchestrator_swagger_ui(
    orch_id: str,
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(docs_security),
):
    """Serve Swagger UI for a specific orchestrator through the WebUI sub-path."""
    current_user = _resolve_docs_user(token, credentials)
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied")

    if not OrchestratorService.get_by_id(orch_id):
        raise HTTPException(status_code=404, detail="Orchestrator not found")

    return get_swagger_ui_html(
        openapi_url=f"/api/proxy/{orch_id}/openapi.json?token={quote_plus(token or credentials.credentials)}",
        title=f"PEON Orchestrator Docs - {orch_id}",
    )

@router.get("/plans")
async def get_plans(current_user: dict = Depends(get_current_user)):
    """Get all available game plans from local warplans"""
    plans = []
    warplans_dir = "/app/peon-warplans"
    
    if os.path.exists(warplans_dir):
        for item in sorted(os.listdir(warplans_dir)):
            game_dir = os.path.join(warplans_dir, item)
            plan_file = os.path.join(warplans_dir, item, "plan.json")
            if os.path.isfile(plan_file):
                try:
                    with open(plan_file, 'r', encoding='utf-8') as f:
                        plan_data = json.load(f)
                        plan_data['game_uid'] = item
                        plan_data['display_name'] = _read_plan_display_name(game_dir, item)
                        plans.append(plan_data)
                except Exception:
                    pass
    
    return plans

@router.put("/plans")
async def refresh_plans(
    request: Request,
    current_user: dict = Depends(get_current_admin_user),
):
    """Force configured orchestrators to refresh their game plan catalogue from the configured plans source."""
    orchestrators = OrchestratorService.get_all(current_user['id'], current_user['role'])
    if not orchestrators:
        raise HTTPException(status_code=404, detail="No orchestrators configured")

    results = []
    failures = []

    for orch in orchestrators:
        try:
            timeout = aiohttp.ClientTimeout(total=90, connect=10, sock_read=80)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                headers = {"X-Api-Key": orch['api_key']}
                base_url = resolve_orchestrator_url(orch['base_url'])
                async with session.put(f"{base_url}/api/v1/plans", headers=headers) as response:
                    payload = await response.json() if response.content else {}
                    if response.status in [200, 201]:
                        results.append({"orchestrator_id": orch['id'], "orchestrator_name": orch['name'], "response": payload})
                    else:
                        failures.append({
                            "orchestrator_id": orch['id'],
                            "orchestrator_name": orch['name'],
                            "status": response.status,
                            "detail": payload.get('detail') or payload.get('info') or 'Plan refresh failed',
                        })
        except asyncio.TimeoutError:
            failures.append({
                "orchestrator_id": orch['id'],
                "orchestrator_name": orch['name'],
                "status": 504,
                "detail": "Orchestrator request timeout",
            })
        except Exception as exc:
            failures.append({
                "orchestrator_id": orch['id'],
                "orchestrator_name": orch['name'],
                "status": 500,
                "detail": str(exc),
            })

    if failures and not results:
        raise HTTPException(status_code=500, detail={"message": "Failed to refresh plans", "failures": failures})

    return {
        "success": True,
        "updated": results,
        "failures": failures,
        "message": "Plan refresh requested" if results else "No orchestrator plan refresh succeeded",
    }


@router.get("/{orch_id}/server/{server_uid}/access")
async def get_server_access_users(
    orch_id: str,
    server_uid: str,
    current_user: dict = Depends(get_current_user)
):
    """List users and their current access for a server."""
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied")

    if not OrchestratorService.can_manage_server(current_user['id'], orch_id, server_uid, current_user['role']):
        raise HTTPException(status_code=403, detail="Server access management requires server owner or admin access")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT
            u.id,
            u.username,
            u.email,
            u.role,
            CASE WHEN uoa.id IS NOT NULL THEN 1 ELSE 0 END AS has_orchestrator_access,
            sl.permissions AS server_permission
        FROM users u
        LEFT JOIN user_orchestrator_access uoa
            ON uoa.user_id = u.id AND uoa.orchestrator_id = ?
        LEFT JOIN server_links sl
            ON sl.user_id = u.id AND sl.orchestrator_id = ? AND sl.server_uid = ?
        ORDER BY u.username COLLATE NOCASE ASC
    ''', (orch_id, orch_id, server_uid))
    users = [dict_from_row(row) for row in cursor.fetchall()]
    conn.close()

    return {
        "server_uid": server_uid,
        "users": users,
    }


@router.post("/{orch_id}/server/{server_uid}/access")
async def grant_server_access(
    orch_id: str,
    server_uid: str,
    payload: GrantServerAccessRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Grant or update a user's access to a specific server."""
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied")

    if not OrchestratorService.can_manage_server(current_user['id'], orch_id, server_uid, current_user['role']):
        raise HTTPException(status_code=403, detail="Server access management requires server owner or admin access")

    requested_permission = str(payload.permissions or 'manage').strip().lower()
    if requested_permission not in ALLOWED_SERVER_LINK_PERMISSIONS:
        raise HTTPException(status_code=400, detail="Invalid permission level")

    if requested_permission == 'owner' and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can grant owner access")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id, username FROM users WHERE id = ?", (payload.user_id,))
    target_user = cursor.fetchone()
    if not target_user:
        conn.close()
        raise HTTPException(status_code=404, detail="Target user not found")

    now = datetime.now(timezone.utc).isoformat()

    # Ensure the target user has orchestrator visibility.
    cursor.execute('''
        INSERT OR IGNORE INTO user_orchestrator_access (id, user_id, orchestrator_id, created_at)
        VALUES (?, ?, ?, ?)
    ''', (str(uuid.uuid4()), payload.user_id, orch_id, now))

    cursor.execute('''
        SELECT id FROM server_links
        WHERE user_id = ? AND orchestrator_id = ? AND server_uid = ?
    ''', (payload.user_id, orch_id, server_uid))
    existing_link = cursor.fetchone()

    if existing_link:
        cursor.execute('''
            UPDATE server_links
            SET permissions = ?
            WHERE id = ?
        ''', (requested_permission, existing_link['id']))
    else:
        cursor.execute('''
            INSERT INTO server_links (id, user_id, orchestrator_id, server_uid, permissions, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), payload.user_id, orch_id, server_uid, requested_permission, now))

    conn.commit()
    conn.close()

    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='create',
        category='user',
        target_type='server_link',
        target_id=payload.user_id,
        details=f"Granted {requested_permission} server access to {target_user['username']} on {server_uid}",
        ip_address=request.client.host if request.client else None
    )

    return {
        "message": "Server access updated",
        "user_id": payload.user_id,
        "server_uid": server_uid,
        "permissions": requested_permission,
    }

@router.get("/{orch_id}/servers")
async def get_servers(orch_id: str, current_user: dict = Depends(get_current_user)):
    """Get servers from specific orchestrator (live fetch)"""
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied to this orchestrator")
    
    orch = OrchestratorService.get_by_id(orch_id)
    if not orch or not orch.get('is_active'):
        raise HTTPException(status_code=404, detail="Orchestrator not found or inactive")
    
    try:
        timeout = aiohttp.ClientTimeout(total=120, connect=10, sock_read=110)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            headers = {"X-Api-Key": orch['api_key']}
            last_error = None

            for base_url in resolve_orchestrator_url_candidates(orch['base_url']):
                url = f"{base_url}/api/v1/servers"

                try:
                    async with session.get(url, headers=headers) as response:
                        if response.status == 200:
                            servers = await response.json()
                            user_server_permissions = OrchestratorService.get_user_server_link_permissions(
                                current_user['id'], orch_id
                            )

                            # Filter servers for non-admin users
                            if current_user['role'] != 'admin':
                                allowed_servers = list(user_server_permissions.keys())
                                if allowed_servers:  # If user has specific server links, filter
                                    servers = [s for s in servers if f"{s.get('game_uid')}.{s.get('servername')}" in allowed_servers]

                            for server in servers:
                                uid = f"{server.get('game_uid')}.{server.get('servername')}"
                                permission = user_server_permissions.get(uid, 'owner' if current_user['role'] == 'admin' else 'read')
                                server['webui_access_permission'] = permission
                                server['webui_can_manage_access'] = (
                                    current_user['role'] == 'admin'
                                    or permission in OrchestratorService.SERVER_MANAGE_PERMISSIONS
                                )

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

                        if response.status == 401:
                            raise HTTPException(status_code=401, detail="Invalid API key")

                        last_error = HTTPException(status_code=response.status, detail="Failed to fetch servers")
                except (asyncio.TimeoutError, aiohttp.ClientError) as exc:
                    last_error = exc
                    continue

            if isinstance(last_error, HTTPException):
                raise last_error
            if isinstance(last_error, asyncio.TimeoutError):
                raise HTTPException(status_code=504, detail="Orchestrator request timeout")
            if last_error:
                raise HTTPException(status_code=500, detail=f"Error fetching servers: {str(last_error)}")

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
        timeout = aiohttp.ClientTimeout(total=60, connect=10, sock_read=50)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            headers = {"X-Api-Key": orch['api_key']}
            base_url = resolve_orchestrator_url(orch['base_url'])
            url = f"{base_url}/api/v1/server/get/{server_uid}"
            
            async with session.get(url, headers=headers) as response:
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
        timeout = aiohttp.ClientTimeout(total=30, connect=5, sock_read=25)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            headers = {"X-Api-Key": orch['api_key']}
            base_url = resolve_orchestrator_url(orch['base_url'])
            
            # Try stats endpoint first
            stats_url = f"{base_url}/api/v1/server/stats/{server_uid}"
            async with session.get(stats_url, headers=headers) as response:
                if response.status == 200:
                    return await response.json()
            
            # Fallback to info endpoint
            info_url = f"{base_url}/api/v1/server/get/{server_uid}"
            async with session.get(info_url, headers=headers) as response:
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
    server_uid = f"{deploy_data.game_uid}.{deploy_data.server_name}"

    # Best-effort logo hydration for newly deployed recipe/game combinations.
    try:
        ensure_png_logo_for_game(deploy_data.game_uid)
    except Exception:
        pass
    
    try:
        timeout = aiohttp.ClientTimeout(total=180, connect=10, sock_read=170)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            headers = {"X-Api-Key": orch['api_key'], "Content-Type": "application/json"}
            base_url = resolve_orchestrator_url(orch['base_url'])
            url = f"{base_url}/api/v1/server/create/{server_uid}"
            
            async with session.put(url, headers=headers, json=deploy_payload) as response:
                try:
                    result = await response.json()
                except Exception:
                    result_text = await response.text()
                    result = {"detail": result_text or "Deploy failed"}
                
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
    except HTTPException:
        raise
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
    # Require admin or server manager access for control actions.
    is_control_action = action in ['start', 'stop', 'restart', 'update', 'create', 'delete']
    if is_control_action and not OrchestratorService.can_manage_server(
        current_user['id'], orch_id, server_uid, current_user['role']
    ):
        raise HTTPException(status_code=403, detail="Server control requires server manager or admin access")
    
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied")
    
    orch = OrchestratorService.get_by_id(orch_id)
    if not orch:
        raise HTTPException(status_code=404, detail="Orchestrator not found")

    # WebUI exposes a single delete action, while the orchestrator expects
    # DELETE /server/destroy/{uid} or /server/eradicate/{uid}.
    orchestrator_action = 'destroy' if action == 'delete' else action
    method = 'delete' if action == 'delete' else 'put'
    
    try:
        timeout = aiohttp.ClientTimeout(total=90, connect=10, sock_read=80)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            headers = {"X-Api-Key": orch['api_key']}
            # Add update mode if applicable
            body = None
            if action == 'update' and update_data:
                body = {"mode": update_data.mode}

            last_error = None

            for base_url in resolve_orchestrator_url_candidates(orch['base_url']):
                url = f"{base_url}/api/v1/server/{orchestrator_action}/{server_uid}"

                try:
                    request_method = getattr(session, method)
                    async with request_method(url, headers=headers, json=body) as response:
                        try:
                            result = await response.json()
                        except Exception:
                            result = {"result": await response.text()}

                        if response.status == 200:
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

                        last_error = HTTPException(
                            status_code=response.status,
                            detail=result.get('info') or result.get('detail') or 'Action failed'
                        )
                except (asyncio.TimeoutError, aiohttp.ClientError) as exc:
                    last_error = exc
                    continue

            if isinstance(last_error, HTTPException):
                raise last_error
            if isinstance(last_error, asyncio.TimeoutError):
                raise HTTPException(status_code=504, detail="Request timeout")
            if last_error:
                raise HTTPException(status_code=500, detail=f"Action error: {str(last_error)}")
            raise HTTPException(status_code=504, detail="Orchestrator request timeout")
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
    
    base_url = resolve_orchestrator_url(orch['base_url'])
    url = f"{base_url}/api/v1/{path}"
    headers = {"X-Api-Key": orch['api_key']}
    
    timeout = aiohttp.ClientTimeout(total=90, connect=10, sock_read=80)
    async with aiohttp.ClientSession(timeout=timeout) as session:
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
                json=body if body else None
            ) as response:
                try:
                    return await response.json()
                except Exception:
                    return {"result": await response.text()}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")
