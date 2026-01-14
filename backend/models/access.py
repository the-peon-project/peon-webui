from pydantic import BaseModel

class UserOrchestratorLink(BaseModel):
    user_id: str
    orchestrator_id: str

class ServerLink(BaseModel):
    user_id: str
    orchestrator_id: str
    server_uid: str
    permissions: str = "read"
