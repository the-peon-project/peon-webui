import uuid
from datetime import datetime, timezone
from typing import Optional, List
import aiohttp
import asyncio
from core.database import get_db, dict_from_row

class OrchestratorService:
    """Service for orchestrator management"""
    
    @staticmethod
    def get_all(user_id: str, role: str) -> List[dict]:
        """Get all orchestrators accessible to user"""
        conn = get_db()
        cursor = conn.cursor()
        
        if role == 'admin':
            cursor.execute("SELECT * FROM orchestrators ORDER BY name")
        else:
            cursor.execute('''
                SELECT o.* FROM orchestrators o
                JOIN user_orchestrator_access uoa ON o.id = uoa.orchestrator_id
                WHERE uoa.user_id = ? AND o.is_active = 1
                ORDER BY o.name
            ''', (user_id,))
        
        orchestrators = [dict_from_row(row) for row in cursor.fetchall()]
        conn.close()
        return orchestrators
    
    @staticmethod
    def get_by_id(orch_id: str) -> Optional[dict]:
        """Get orchestrator by ID"""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orchestrators WHERE id = ?", (orch_id,))
        orch = cursor.fetchone()
        conn.close()
        return dict_from_row(orch) if orch else None
    
    @staticmethod
    def create(name: str, base_url: str, api_key: str, created_by: str, 
               description: Optional[str] = None, version: Optional[str] = None) -> dict:
        """Create a new orchestrator"""
        conn = get_db()
        cursor = conn.cursor()
        
        orch_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        cursor.execute('''
            INSERT INTO orchestrators (id, name, base_url, api_key, description, version, is_active, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        ''', (orch_id, name, base_url, api_key, description, version, created_by, now))
        
        conn.commit()
        conn.close()
        
        return {
            'id': orch_id,
            'name': name,
            'base_url': base_url,
            'description': description,
            'version': version,
            'is_active': True,
            'created_by': created_by,
            'created_at': now,
            'last_synced': None
        }
    
    @staticmethod
    def update(orch_id: str, updates: dict) -> Optional[dict]:
        """Update orchestrator"""
        conn = get_db()
        cursor = conn.cursor()
        
        fields = []
        values = []
        for key, value in updates.items():
            if key in ['name', 'base_url', 'api_key', 'description', 'version', 'is_active']:
                fields.append(f"{key} = ?")
                values.append(value)
        
        if not fields:
            conn.close()
            return None
        
        values.append(orch_id)
        cursor.execute(f"UPDATE orchestrators SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
        
        cursor.execute("SELECT * FROM orchestrators WHERE id = ?", (orch_id,))
        orch = dict_from_row(cursor.fetchone())
        conn.close()
        
        return orch
    
    @staticmethod
    def delete(orch_id: str) -> bool:
        """Delete an orchestrator"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Delete related data
        cursor.execute("DELETE FROM user_orchestrator_access WHERE orchestrator_id = ?", (orch_id,))
        cursor.execute("DELETE FROM server_links WHERE orchestrator_id = ?", (orch_id,))
        cursor.execute("DELETE FROM cached_servers WHERE orchestrator_id = ?", (orch_id,))
        cursor.execute("DELETE FROM orchestrators WHERE id = ?", (orch_id,))
        
        conn.commit()
        conn.close()
        return True
    
    @staticmethod
    async def test_connection(base_url: str, api_key: str) -> dict:
        """Test connection to an orchestrator"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"X-Api-Key": api_key}
                url = f"{base_url}/api/v1/orchestrator"
                
                async with session.get(url, headers=headers, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "success": True,
                            "message": f"Connected successfully! Version: {data.get('version', 'Unknown')}"
                        }
                    elif response.status == 401:
                        return {"success": False, "message": "Invalid API key"}
                    else:
                        return {"success": False, "message": f"Connection failed: HTTP {response.status}"}
        except asyncio.TimeoutError:
            return {"success": False, "message": "Connection timeout"}
        except Exception as e:
            return {"success": False, "message": f"Connection error: {str(e)}"}
    
    @staticmethod
    def check_user_access(user_id: str, orch_id: str, role: str) -> bool:
        """Check if user has access to orchestrator"""
        if role == 'admin':
            return True
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id FROM user_orchestrator_access 
            WHERE user_id = ? AND orchestrator_id = ?
        ''', (user_id, orch_id))
        has_access = cursor.fetchone() is not None
        conn.close()
        
        return has_access
    
    @staticmethod
    def get_user_server_links(user_id: str, orch_id: str) -> List[str]:
        """Get list of server UIDs user has access to"""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT server_uid FROM server_links
            WHERE user_id = ? AND orchestrator_id = ?
        ''', (user_id, orch_id))
        servers = [row[0] for row in cursor.fetchall()]
        conn.close()
        return servers
