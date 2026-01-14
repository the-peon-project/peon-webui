import uuid
from datetime import datetime, timezone
from typing import Optional, List
from core.database import get_db, dict_from_row
from core.security import get_password_hash, verify_password

class UserService:
    """Service for user management"""
    
    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[dict]:
        """Get user by ID"""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        conn.close()
        return dict_from_row(user) if user else None
    
    @staticmethod
    def get_user_by_username(username: str) -> Optional[dict]:
        """Get user by username"""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        conn.close()
        return dict_from_row(user) if user else None
    
    @staticmethod
    def get_all_users() -> List[dict]:
        """Get all users with their orchestrator access"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users ORDER BY created_at DESC")
        users = []
        for row in cursor.fetchall():
            user = dict_from_row(row)
            # Get orchestrator access
            cursor.execute('''
                SELECT o.id, o.name FROM user_orchestrator_access uoa
                JOIN orchestrators o ON uoa.orchestrator_id = o.id
                WHERE uoa.user_id = ?
            ''', (user['id'],))
            user['orchestrators'] = [dict_from_row(r) for r in cursor.fetchall()]
            
            # Get server links
            cursor.execute('''
                SELECT orchestrator_id, server_uid, permissions FROM server_links
                WHERE user_id = ?
            ''', (user['id'],))
            user['server_links'] = [dict_from_row(r) for r in cursor.fetchall()]
            
            users.append(user)
        
        conn.close()
        return users
    
    @staticmethod
    def create_user(username: str, email: str, password: str, role: str = 'user') -> dict:
        """Create a new user"""
        conn = get_db()
        cursor = conn.cursor()
        
        user_id = str(uuid.uuid4())
        password_hash = get_password_hash(password)
        now = datetime.now(timezone.utc).isoformat()
        
        cursor.execute('''
            INSERT INTO users (id, username, email, password_hash, role, is_chat_banned, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?)
        ''', (user_id, username, email, password_hash, role, now))
        
        conn.commit()
        conn.close()
        
        return {
            'id': user_id,
            'username': username,
            'email': email,
            'role': role,
            'is_chat_banned': False,
            'created_at': now
        }
    
    @staticmethod
    def update_user(user_id: str, updates: dict) -> Optional[dict]:
        """Update user fields"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Build update query dynamically
        fields = []
        values = []
        for key, value in updates.items():
            if key in ['username', 'email', 'role', 'is_chat_banned']:
                fields.append(f"{key} = ?")
                values.append(value)
        
        if not fields:
            conn.close()
            return None
        
        values.append(user_id)
        cursor.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
        
        # Return updated user
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = dict_from_row(cursor.fetchone())
        conn.close()
        
        return user
    
    @staticmethod
    def change_password(user_id: str, new_password: str) -> bool:
        """Change user password"""
        conn = get_db()
        cursor = conn.cursor()
        
        password_hash = get_password_hash(new_password)
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))
        
        conn.commit()
        conn.close()
        return True
    
    @staticmethod
    def delete_user(user_id: str) -> bool:
        """Delete a user"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Delete related data
        cursor.execute("DELETE FROM user_orchestrator_access WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM server_links WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM session_rsvps WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        
        conn.commit()
        conn.close()
        return True
    
    @staticmethod
    def ban_from_chat(user_id: str) -> bool:
        """Ban user from chat"""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET is_chat_banned = 1 WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()
        return True
    
    @staticmethod
    def unban_from_chat(user_id: str) -> bool:
        """Unban user from chat"""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET is_chat_banned = 0 WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()
        return True
