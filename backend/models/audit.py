from pydantic import BaseModel
from typing import Optional

class AuditLogCreate(BaseModel):
    action_type: str  # create, update, delete, login, logout, action
    category: str  # user, server, chat, session, auth, system
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None

class AuditLogEntry(BaseModel):
    id: str
    user_id: str
    username: str
    action_type: str
    category: str
    target_type: Optional[str]
    target_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: str
