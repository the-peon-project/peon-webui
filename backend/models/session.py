from pydantic import BaseModel
from typing import Optional

class SessionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    orchestrator_id: str
    server_uid: Optional[str] = None
    scheduled_time: str
    duration_minutes: int = 120

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    server_uid: Optional[str] = None
    scheduled_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None

class Session(BaseModel):
    id: str
    title: str
    description: Optional[str]
    orchestrator_id: str
    server_uid: Optional[str]
    scheduled_time: str
    duration_minutes: int
    created_by: str
    created_at: str
    status: str

class SessionRSVP(BaseModel):
    session_id: str
    status: str = "attending"  # attending, maybe, declined
