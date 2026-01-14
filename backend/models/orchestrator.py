from pydantic import BaseModel
from typing import Optional

class OrchestratorCreate(BaseModel):
    name: str
    base_url: str
    api_key: str
    description: Optional[str] = None
    version: Optional[str] = None

class OrchestratorUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    is_active: Optional[bool] = None

class Orchestrator(BaseModel):
    id: str
    name: str
    base_url: str
    description: Optional[str]
    version: Optional[str]
    is_active: bool
    created_by: str
    created_at: str
    last_synced: Optional[str]
