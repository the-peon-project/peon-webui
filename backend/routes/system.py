from fastapi import APIRouter, Depends, HTTPException
from datetime import timedelta
import uuid
from datetime import datetime, timezone

from core.database import get_db, dict_from_row, init_db
from core.security import get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from models.system import SystemStatus, AdminWizardComplete, FeatureFlags
from services.features import FeatureService
from services.audit import AuditService

router = APIRouter(prefix="/system")

@router.get("/status", response_model=SystemStatus)
async def system_status():
    """Check if system is initialized and has admin user"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if initialized
    cursor.execute("SELECT value FROM system_config WHERE key = 'initialized'")
    initialized_row = cursor.fetchone()
    initialized = bool(initialized_row and initialized_row[0] == 'true')
    
    # Check if admin exists
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
    has_admin = cursor.fetchone()[0] > 0
    
    conn.close()
    
    return {"initialized": initialized, "has_admin": has_admin}

@router.post("/wizard")
async def complete_wizard(wizard_data: AdminWizardComplete):
    """Complete the first-time setup wizard"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if already initialized
    cursor.execute("SELECT value FROM system_config WHERE key = 'initialized'")
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="System already initialized")
    
    # Check if admin already exists
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
    if cursor.fetchone()[0] > 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Admin user already exists")
    
    # Create admin user
    admin_id = str(uuid.uuid4())
    password_hash = get_password_hash(wizard_data.admin_password)
    now = datetime.now(timezone.utc).isoformat()
    
    cursor.execute('''
        INSERT INTO users (id, username, email, password_hash, role, is_chat_banned, created_at)
        VALUES (?, ?, ?, ?, 'admin', 0, ?)
    ''', (admin_id, wizard_data.admin_username, wizard_data.admin_email, password_hash, now))
    
    # Optionally create orchestrator
    if wizard_data.orchestrator_name and wizard_data.orchestrator_url and wizard_data.orchestrator_api_key:
        orch_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO orchestrators (id, name, base_url, api_key, is_active, created_by, created_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
        ''', (orch_id, wizard_data.orchestrator_name, wizard_data.orchestrator_url, 
              wizard_data.orchestrator_api_key, admin_id, now))
    
    # Mark system as initialized
    cursor.execute("INSERT INTO system_config (key, value) VALUES ('initialized', 'true')")
    
    conn.commit()
    conn.close()
    
    # Initialize default feature flags (after closing the first connection)
    FeatureService.update_features({
        'online_users': True,
        'chat': True,
        'gaming_sessions': True,
        'server_stats': True
    })
    
    # Log system initialization
    AuditService.log(
        user_id=admin_id,
        username=wizard_data.admin_username,
        action_type='create',
        category='system',
        details='System initialized via setup wizard'
    )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": admin_id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": admin_id,
            "username": wizard_data.admin_username,
            "email": wizard_data.admin_email,
            "role": "admin",
            "is_chat_banned": False,
            "created_at": now
        }
    }

@router.get("/features")
async def get_features():
    """Get all feature flags"""
    return FeatureService.get_features()

@router.put("/features")
async def update_features(features: FeatureFlags):
    """Update feature flags (admin only)"""
    from core.security import get_current_admin_user
    # Note: In production, add Depends(get_current_admin_user)
    return FeatureService.update_features(features.model_dump())
