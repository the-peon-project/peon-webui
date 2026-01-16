from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Dict
import re

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
    
    @field_validator('orchestrator_url')
    @classmethod
    def validate_url(cls, v):
        if v is None or v == '':
            return v
        # Basic URL validation - must start with http:// or https:// and should include port for non-standard ports
        if not re.match(r'^https?://.+', v):
            raise ValueError('URL must start with http:// or https://')
        # Warn if port is missing (not 80 or 443) by checking if there's a : after the domain
        if ':' not in v.split('://')[1].split('/')[0].split('?')[0]:
            # Port might be missing - this is just a warning, we'll allow it
            pass
        return v

class FeatureFlags(BaseModel):
    online_users: bool = True
    chat: bool = True
    gaming_sessions: bool = True
    server_stats: bool = True
