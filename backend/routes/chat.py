from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, Request
import uuid
from datetime import datetime, timezone
import logging

from core.database import get_db, dict_from_row
from core.security import get_current_user, get_current_moderator_user, decode_token
from core.websocket import chat_manager
from services.audit import AuditService
from services.features import FeatureService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat")

@router.get("/messages")
async def get_messages(
    limit: int = Query(50, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Get chat messages (HTTP fallback)"""
    if not FeatureService.is_enabled('chat'):
        raise HTTPException(status_code=403, detail="Chat is disabled")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT m.id, m.message, m.created_at, u.id as user_id, u.username
        FROM chat_messages m
        JOIN users u ON m.user_id = u.id
        ORDER BY m.created_at DESC
        LIMIT ?
    ''', (limit,))
    
    messages = [dict_from_row(row) for row in cursor.fetchall()]
    conn.close()
    
    return list(reversed(messages))

@router.post("/messages")
async def send_message(
    message: str = Query(..., max_length=1000),
    current_user: dict = Depends(get_current_user)
):
    """Send a chat message (HTTP fallback)"""
    if not FeatureService.is_enabled('chat'):
        raise HTTPException(status_code=403, detail="Chat is disabled")
    
    if current_user.get('is_chat_banned'):
        raise HTTPException(status_code=403, detail="You are banned from chat")
    
    message = message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    conn = get_db()
    cursor = conn.cursor()
    
    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    cursor.execute(
        "INSERT INTO chat_messages (id, user_id, message, created_at) VALUES (?, ?, ?, ?)",
        (msg_id, current_user['id'], message, now)
    )
    conn.commit()
    conn.close()
    
    # Broadcast to WebSocket clients
    await chat_manager.broadcast({
        "type": "chat_message",
        "message": {
            "id": msg_id,
            "message": message,
            "created_at": now,
            "user_id": current_user['id'],
            "username": current_user['username']
        }
    })
    
    return {
        "id": msg_id,
        "message": message,
        "created_at": now,
        "user_id": current_user['id'],
        "username": current_user['username']
    }

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    request: Request,
    current_user: dict = Depends(get_current_moderator_user)
):
    """Delete a chat message (moderator+)"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM chat_messages WHERE id = ?", (message_id,))
    msg = cursor.fetchone()
    if not msg:
        conn.close()
        raise HTTPException(status_code=404, detail="Message not found")
    
    cursor.execute("DELETE FROM chat_messages WHERE id = ?", (message_id,))
    conn.commit()
    conn.close()
    
    # Broadcast deletion to clients
    await chat_manager.broadcast({
        "type": "message_deleted",
        "message_id": message_id
    })
    
    # Log message deletion
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='delete',
        category='chat',
        target_type='message',
        target_id=message_id,
        details='Deleted chat message',
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "Message deleted"}

@router.delete("/clear")
async def clear_all_chat(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Clear all chat messages (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM chat_messages")
    count = cursor.fetchone()[0]
    
    cursor.execute("DELETE FROM chat_messages")
    conn.commit()
    conn.close()
    
    # Broadcast chat cleared
    await chat_manager.broadcast({
        "type": "chat_cleared"
    })
    
    # Log chat clear
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='clear',
        category='chat',
        details=f'Cleared all chat messages ({count} messages)',
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": f"Cleared {count} messages"}

@router.get("/online")
async def get_online_users(current_user: dict = Depends(get_current_user)):
    """Get list of online users"""
    if not FeatureService.is_enabled('online_users'):
        return []
    
    online_ids = chat_manager.get_online_users()
    
    if not online_ids:
        return []
    
    conn = get_db()
    cursor = conn.cursor()
    
    placeholders = ','.join(['?' for _ in online_ids])
    cursor.execute(f'''
        SELECT id, username, role FROM users WHERE id IN ({placeholders})
    ''', online_ids)
    
    users = [dict_from_row(row) for row in cursor.fetchall()]
    conn.close()
    
    return users
