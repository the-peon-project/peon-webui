import logging
from typing import Dict
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time features"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # user_id -> websocket

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept and track a new WebSocket connection"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected: user {user_id}")

    def disconnect(self, user_id: str):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"WebSocket disconnected: user {user_id}")

    def get_online_users(self) -> list:
        """Get list of currently connected user IDs"""
        return list(self.active_connections.keys())

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for user_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(user_id)
        
        # Clean up disconnected clients
        for user_id in disconnected:
            self.disconnect(user_id)

    async def send_personal(self, user_id: str, message: dict):
        """Send message to specific user"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception:
                self.disconnect(user_id)

# Global chat manager instance
chat_manager = ConnectionManager()
