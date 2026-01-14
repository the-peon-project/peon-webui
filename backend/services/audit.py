import uuid
import json
from datetime import datetime, timezone
from typing import Optional, List
from core.database import get_db, dict_from_row

class AuditService:
    """Service for managing audit logs"""
    
    CATEGORIES = ['user', 'server', 'chat', 'session', 'auth', 'system']
    ACTION_TYPES = ['create', 'update', 'delete', 'login', 'logout', 'action', 'ban', 'unban', 'clear']
    
    @staticmethod
    def log(
        user_id: str,
        username: str,
        action_type: str,
        category: str,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> str:
        """Create an audit log entry"""
        conn = get_db()
        cursor = conn.cursor()
        
        log_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        cursor.execute('''
            INSERT INTO audit_log (id, user_id, username, action_type, category, target_type, target_id, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (log_id, user_id, username, action_type, category, target_type, target_id, details, ip_address, now))
        
        conn.commit()
        conn.close()
        
        return log_id
    
    @staticmethod
    def get_logs(
        category: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        user_id: Optional[str] = None
    ) -> List[dict]:
        """Get audit logs with optional filtering"""
        conn = get_db()
        cursor = conn.cursor()
        
        query = "SELECT * FROM audit_log WHERE 1=1"
        params = []
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        logs = [dict_from_row(row) for row in cursor.fetchall()]
        conn.close()
        
        return logs
    
    @staticmethod
    def get_log_counts_by_category() -> dict:
        """Get count of logs per category"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT category, COUNT(*) as count 
            FROM audit_log 
            GROUP BY category
        ''')
        
        counts = {row['category']: row['count'] for row in cursor.fetchall()}
        conn.close()
        
        return counts
