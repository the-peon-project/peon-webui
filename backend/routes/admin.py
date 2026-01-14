from fastapi import APIRouter, Depends, HTTPException, Request, Query
from typing import Optional
import uuid
from datetime import datetime, timezone

from core.database import get_db, dict_from_row
from core.security import get_current_admin_user, get_password_hash
from models.user import UserCreate, UserUpdate, PasswordChange
from models.access import UserOrchestratorLink, ServerLink
from models.system import FeatureFlags
from services.audit import AuditService
from services.user import UserService
from services.features import FeatureService

router = APIRouter(prefix="/admin")

# ============ User Management ============

@router.get("/users")
async def get_users(current_user: dict = Depends(get_current_admin_user)):
    """Get all users with their access details"""
    return UserService.get_all_users()

@router.post("/users")
async def create_user(
    user_data: UserCreate,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Create a new user"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if username exists
    cursor.execute("SELECT id FROM users WHERE username = ?", (user_data.username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already exists")
    
    conn.close()
    
    user = UserService.create_user(
        username=user_data.username,
        email=user_data.email,
        password=user_data.password,
        role=user_data.role
    )
    
    # Log user creation
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='create',
        category='user',
        target_type='user',
        target_id=user['id'],
        details=f"Created user: {user_data.username} with role: {user_data.role}",
        ip_address=request.client.host if request.client else None
    )
    
    return user

@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Update a user"""
    updates = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    user = UserService.update_user(user_id, updates)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Log user update
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='update',
        category='user',
        target_type='user',
        target_id=user_id,
        details=f"Updated user fields: {', '.join(updates.keys())}",
        ip_address=request.client.host if request.client else None
    )
    
    return user

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Delete a user"""
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = UserService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    UserService.delete_user(user_id)
    
    # Log user deletion
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='delete',
        category='user',
        target_type='user',
        target_id=user_id,
        details=f"Deleted user: {user['username']}",
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "User deleted successfully"}

@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    password_data: PasswordChange,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Reset a user's password (admin only)"""
    user = UserService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if len(password_data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    UserService.change_password(user_id, password_data.new_password)
    
    # Log password reset
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='update',
        category='user',
        target_type='user',
        target_id=user_id,
        details=f"Reset password for user: {user['username']}",
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "Password reset successfully"}

# ============ User Access Links ============

@router.post("/link-user-orchestrator")
async def link_user_orchestrator(
    link: UserOrchestratorLink,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Link a user to an orchestrator"""
    conn = get_db()
    cursor = conn.cursor()
    
    link_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    try:
        cursor.execute('''
            INSERT INTO user_orchestrator_access (id, user_id, orchestrator_id, created_at)
            VALUES (?, ?, ?, ?)
        ''', (link_id, link.user_id, link.orchestrator_id, now))
        conn.commit()
    except Exception:
        conn.close()
        raise HTTPException(status_code=400, detail="Link already exists or invalid IDs")
    
    conn.close()
    
    # Log link creation
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='create',
        category='user',
        target_type='orchestrator_link',
        target_id=link_id,
        details=f"Linked user {link.user_id} to orchestrator {link.orchestrator_id}",
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "User linked to orchestrator"}

@router.delete("/link-user-orchestrator")
async def unlink_user_orchestrator(
    link: UserOrchestratorLink,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Unlink a user from an orchestrator"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        DELETE FROM user_orchestrator_access
        WHERE user_id = ? AND orchestrator_id = ?
    ''', (link.user_id, link.orchestrator_id))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Link not found")
    
    conn.commit()
    conn.close()
    
    # Log link deletion
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='delete',
        category='user',
        target_type='orchestrator_link',
        details=f"Unlinked user {link.user_id} from orchestrator {link.orchestrator_id}",
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "User unlinked from orchestrator"}

@router.post("/link-user-server")
async def link_user_server(
    link: ServerLink,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Link a user to a specific server"""
    conn = get_db()
    cursor = conn.cursor()
    
    link_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    try:
        cursor.execute('''
            INSERT INTO server_links (id, user_id, orchestrator_id, server_uid, permissions, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (link_id, link.user_id, link.orchestrator_id, link.server_uid, link.permissions, now))
        conn.commit()
    except Exception:
        conn.close()
        raise HTTPException(status_code=400, detail="Link already exists or invalid IDs")
    
    conn.close()
    
    # Log link creation
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='create',
        category='user',
        target_type='server_link',
        target_id=link_id,
        details=f"Linked user {link.user_id} to server {link.server_uid}",
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "User linked to server"}

@router.delete("/link-user-server")
async def unlink_user_server(
    link: ServerLink,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Unlink a user from a specific server"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        DELETE FROM server_links
        WHERE user_id = ? AND orchestrator_id = ? AND server_uid = ?
    ''', (link.user_id, link.orchestrator_id, link.server_uid))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Link not found")
    
    conn.commit()
    conn.close()
    
    # Log link deletion
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='delete',
        category='user',
        target_type='server_link',
        details=f"Unlinked user {link.user_id} from server {link.server_uid}",
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "User unlinked from server"}

# ============ Chat Moderation ============

@router.post("/users/{user_id}/ban-chat")
async def ban_user_from_chat(
    user_id: str,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Ban a user from chat"""
    user = UserService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    UserService.ban_from_chat(user_id)
    
    # Log ban
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='ban',
        category='chat',
        target_type='user',
        target_id=user_id,
        details=f"Banned user {user['username']} from chat",
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "User banned from chat"}

@router.post("/users/{user_id}/unban-chat")
async def unban_user_from_chat(
    user_id: str,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Unban a user from chat"""
    user = UserService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    UserService.unban_from_chat(user_id)
    
    # Log unban
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='unban',
        category='chat',
        target_type='user',
        target_id=user_id,
        details=f"Unbanned user {user['username']} from chat",
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "User unbanned from chat"}

@router.delete("/users/{user_id}/chat-history")
async def delete_user_chat_history(
    user_id: str,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Delete all chat messages from a user"""
    user = UserService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chat_messages WHERE user_id = ?", (user_id,))
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    
    # Log chat history deletion
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='delete',
        category='chat',
        target_type='user_chat_history',
        target_id=user_id,
        details=f"Deleted {deleted_count} messages from user {user['username']}",
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": f"Deleted {deleted_count} messages"}

# ============ Feature Flags ============

@router.get("/features")
async def get_features(current_user: dict = Depends(get_current_admin_user)):
    """Get all feature flags"""
    return FeatureService.get_features()

@router.put("/features")
async def update_features(
    features: FeatureFlags,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Update feature flags"""
    updated = FeatureService.update_features(features.model_dump())
    
    # Log feature update
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='update',
        category='system',
        target_type='features',
        details=f"Updated feature flags: {features.model_dump()}",
        ip_address=request.client.host if request.client else None
    )
    
    return updated

# ============ Audit Log ============

@router.get("/audit-log")
async def get_audit_log(
    category: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    current_user: dict = Depends(get_current_admin_user)
):
    """Get audit log entries"""
    logs = AuditService.get_logs(category=category, limit=limit, offset=offset)
    counts = AuditService.get_log_counts_by_category()
    
    return {
        "logs": logs,
        "counts": counts,
        "total": sum(counts.values())
    }
