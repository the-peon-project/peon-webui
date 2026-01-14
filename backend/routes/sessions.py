from fastapi import APIRouter, Depends, HTTPException, Request, Query
import uuid
from datetime import datetime, timezone
from typing import Optional

from core.database import get_db, dict_from_row
from core.security import get_current_user, get_current_moderator_user
from models.session import SessionCreate, SessionUpdate
from services.audit import AuditService
from services.features import FeatureService

router = APIRouter(prefix="/sessions")

@router.get("")
async def get_sessions(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get all gaming sessions"""
    if not FeatureService.is_enabled('gaming_sessions'):
        raise HTTPException(status_code=403, detail="Gaming sessions are disabled")
    
    conn = get_db()
    cursor = conn.cursor()
    
    query = '''
        SELECT s.*, u.username as creator_username
        FROM gaming_sessions s
        LEFT JOIN users u ON s.created_by = u.id
    '''
    params = []
    
    if status:
        query += " WHERE s.status = ?"
        params.append(status)
    
    query += " ORDER BY s.scheduled_time ASC"
    
    cursor.execute(query, params)
    sessions = []
    
    for row in cursor.fetchall():
        session = dict_from_row(row)
        
        # Get RSVPs for this session
        cursor.execute('''
            SELECT r.*, u.username
            FROM session_rsvps r
            JOIN users u ON r.user_id = u.id
            WHERE r.session_id = ?
        ''', (session['id'],))
        session['rsvps'] = [dict_from_row(r) for r in cursor.fetchall()]
        
        sessions.append(session)
    
    conn.close()
    return sessions

@router.post("")
async def create_session(
    session_data: SessionCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new gaming session"""
    if not FeatureService.is_enabled('gaming_sessions'):
        raise HTTPException(status_code=403, detail="Gaming sessions are disabled")
    
    conn = get_db()
    cursor = conn.cursor()
    
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    cursor.execute('''
        INSERT INTO gaming_sessions (id, title, description, orchestrator_id, server_uid, scheduled_time, duration_minutes, created_by, created_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
    ''', (session_id, session_data.title, session_data.description, session_data.orchestrator_id,
          session_data.server_uid, session_data.scheduled_time, session_data.duration_minutes,
          current_user['id'], now))
    
    conn.commit()
    conn.close()
    
    # Log session creation
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='create',
        category='session',
        target_type='session',
        target_id=session_id,
        details=f"Created gaming session: {session_data.title}",
        ip_address=request.client.host if request.client else None
    )
    
    return {
        "id": session_id,
        "title": session_data.title,
        "description": session_data.description,
        "orchestrator_id": session_data.orchestrator_id,
        "server_uid": session_data.server_uid,
        "scheduled_time": session_data.scheduled_time,
        "duration_minutes": session_data.duration_minutes,
        "created_by": current_user['id'],
        "created_at": now,
        "status": "scheduled"
    }

@router.put("/{session_id}")
async def update_session(
    session_id: str,
    session_data: SessionUpdate,
    request: Request,
    current_user: dict = Depends(get_current_moderator_user)
):
    """Update a gaming session"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if session exists
    cursor.execute("SELECT * FROM gaming_sessions WHERE id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")
    
    updates = {k: v for k, v in session_data.model_dump().items() if v is not None}
    if not updates:
        conn.close()
        raise HTTPException(status_code=400, detail="No updates provided")
    
    fields = [f"{k} = ?" for k in updates.keys()]
    values = list(updates.values()) + [session_id]
    
    cursor.execute(f"UPDATE gaming_sessions SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    
    cursor.execute("SELECT * FROM gaming_sessions WHERE id = ?", (session_id,))
    updated = dict_from_row(cursor.fetchone())
    conn.close()
    
    # Log session update
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='update',
        category='session',
        target_type='session',
        target_id=session_id,
        details=f"Updated session fields: {', '.join(updates.keys())}",
        ip_address=request.client.host if request.client else None
    )
    
    return updated

@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete a gaming session"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM gaming_sessions WHERE id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_dict = dict_from_row(session)
    
    # Only creator or moderator/admin can delete
    if session_dict['created_by'] != current_user['id'] and current_user['role'] not in ['admin', 'moderator']:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")
    
    # Delete RSVPs first
    cursor.execute("DELETE FROM session_rsvps WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM gaming_sessions WHERE id = ?", (session_id,))
    
    conn.commit()
    conn.close()
    
    # Log session deletion
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='delete',
        category='session',
        target_type='session',
        target_id=session_id,
        details=f"Deleted gaming session: {session_dict['title']}",
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "Session deleted successfully"}

@router.post("/{session_id}/rsvp")
async def rsvp_session(
    session_id: str,
    status: str = Query("attending"),
    current_user: dict = Depends(get_current_user)
):
    """RSVP to a gaming session"""
    if status not in ['attending', 'maybe', 'declined']:
        raise HTTPException(status_code=400, detail="Invalid RSVP status")
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if session exists
    cursor.execute("SELECT id FROM gaming_sessions WHERE id = ?", (session_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")
    
    rsvp_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Upsert RSVP
    cursor.execute('''
        INSERT INTO session_rsvps (id, session_id, user_id, status, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(session_id, user_id) DO UPDATE SET status = ?, created_at = ?
    ''', (rsvp_id, session_id, current_user['id'], status, now, status, now))
    
    conn.commit()
    conn.close()
    
    return {"message": f"RSVP updated to {status}"}

@router.delete("/{session_id}/rsvp")
async def cancel_rsvp(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel RSVP to a gaming session"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        DELETE FROM session_rsvps
        WHERE session_id = ? AND user_id = ?
    ''', (session_id, current_user['id']))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="RSVP not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "RSVP cancelled"}
