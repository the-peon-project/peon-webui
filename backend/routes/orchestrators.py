from fastapi import APIRouter, Depends, HTTPException, Request
import uuid
from datetime import datetime, timezone

from core.database import get_db, dict_from_row
from core.security import get_current_user, get_current_admin_user
from models.orchestrator import OrchestratorCreate, OrchestratorUpdate
from services.orchestrator import OrchestratorService
from services.audit import AuditService

router = APIRouter(prefix="/orchestrators")

@router.get("")
async def get_orchestrators(current_user: dict = Depends(get_current_user)):
    """Get all orchestrators accessible to the current user"""
    orchestrators = OrchestratorService.get_all(current_user['id'], current_user['role'])
    
    # Remove api_key from response for non-admins
    if current_user['role'] != 'admin':
        for orch in orchestrators:
            orch.pop('api_key', None)
    
    return orchestrators

@router.get("/{orch_id}")
async def get_orchestrator(orch_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific orchestrator"""
    if not OrchestratorService.check_user_access(current_user['id'], orch_id, current_user['role']):
        raise HTTPException(status_code=403, detail="Access denied")
    
    orch = OrchestratorService.get_by_id(orch_id)
    if not orch:
        raise HTTPException(status_code=404, detail="Orchestrator not found")
    
    # Remove api_key for non-admins
    if current_user['role'] != 'admin':
        orch.pop('api_key', None)
    
    return orch

@router.post("")
async def create_orchestrator(
    orch_data: OrchestratorCreate,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Create a new orchestrator"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if name exists
    cursor.execute("SELECT id FROM orchestrators WHERE name = ?", (orch_data.name,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Orchestrator name already exists")
    
    conn.close()
    
    orch = OrchestratorService.create(
        name=orch_data.name,
        base_url=orch_data.base_url,
        api_key=orch_data.api_key,
        created_by=current_user['id'],
        description=orch_data.description,
        version=orch_data.version
    )
    
    # Log orchestrator creation
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='create',
        category='system',
        target_type='orchestrator',
        target_id=orch['id'],
        details=f"Created orchestrator: {orch_data.name}",
        ip_address=request.client.host if request.client else None
    )
    
    return orch

@router.put("/{orch_id}")
async def update_orchestrator(
    orch_id: str,
    orch_data: OrchestratorUpdate,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Update an orchestrator"""
    updates = {k: v for k, v in orch_data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    orch = OrchestratorService.update(orch_id, updates)
    if not orch:
        raise HTTPException(status_code=404, detail="Orchestrator not found")
    
    # Log orchestrator update
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='update',
        category='system',
        target_type='orchestrator',
        target_id=orch_id,
        details=f"Updated orchestrator fields: {', '.join(updates.keys())}",
        ip_address=request.client.host if request.client else None
    )
    
    return orch

@router.delete("/{orch_id}")
async def delete_orchestrator(
    orch_id: str,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Delete an orchestrator"""
    orch = OrchestratorService.get_by_id(orch_id)
    if not orch:
        raise HTTPException(status_code=404, detail="Orchestrator not found")
    
    OrchestratorService.delete(orch_id)
    
    # Log orchestrator deletion
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='delete',
        category='system',
        target_type='orchestrator',
        target_id=orch_id,
        details=f"Deleted orchestrator: {orch['name']}",
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "Orchestrator deleted successfully"}

@router.post("/test")
async def test_orchestrator_connection(base_url: str, api_key: str):
    """Test connection to an orchestrator"""
    result = await OrchestratorService.test_connection(base_url, api_key)
    return result
