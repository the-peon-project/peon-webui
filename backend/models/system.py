from pydantic import BaseModel, EmailStr
from typing import Optional, Dict

class SystemStatus(BaseModel):
    initialized: bool
    has_admin: bool

class AdminWizard(BaseModel):
    admin_username: str
    admin_email: EmailStr
    admin_password: str

class AdminWizardComplete(BaseModel):
    admin_username: str
    admin_email: EmailStr
    admin_password: str
    orchestrator_name: Optional[str] = None
    orchestrator_url: Optional[str] = None
    orchestrator_api_key: Optional[str] = None

class FeatureFlags(BaseModel):
    online_users: bool = True
    chat: bool = True
    gaming_sessions: bool = True
    server_stats: bool = True
