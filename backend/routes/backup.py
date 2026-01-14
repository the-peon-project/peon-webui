"""
Backup and Restore API
Backup and restore application data and server configurations
"""
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import Optional
import os
import json
import shutil
import tempfile
import zipfile
from datetime import datetime, timezone
from pydantic import BaseModel

from core.database import get_db
from core.security import get_current_admin_user
from services.audit import AuditService

router = APIRouter(prefix="/backup")

BACKUP_DIR = "/app/backups"


class RestoreOptions(BaseModel):
    restore_users: bool = True
    restore_orchestrators: bool = True
    restore_chat: bool = False
    restore_sessions: bool = False
    restore_settings: bool = True


def ensure_backup_dir():
    """Ensure backup directory exists"""
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)


@router.get("/list")
async def list_backups(current_user: dict = Depends(get_current_admin_user)):
    """List all available backups"""
    ensure_backup_dir()
    
    backups = []
    for filename in os.listdir(BACKUP_DIR):
        if filename.endswith('.zip'):
            filepath = os.path.join(BACKUP_DIR, filename)
            stat = os.stat(filepath)
            backups.append({
                "filename": filename,
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                "size_human": f"{stat.st_size / 1024 / 1024:.2f} MB"
            })
    
    # Sort by creation date, newest first
    backups.sort(key=lambda x: x['created_at'], reverse=True)
    return backups


@router.post("/create")
async def create_backup(
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Create a new backup of the application data"""
    ensure_backup_dir()
    
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"peon_backup_{timestamp}.zip"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Collect data to backup
        backup_data = {
            "version": "1.0",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user['username'],
            "tables": {}
        }
        
        # Backup users (excluding passwords for security - they'll need to be reset)
        cursor.execute("SELECT id, username, email, role, created_at FROM users")
        users = [dict(row) for row in cursor.fetchall()]
        backup_data["tables"]["users"] = users
        
        # Backup orchestrators
        cursor.execute("SELECT id, name, base_url, description, created_at FROM orchestrators")
        orchestrators = [dict(row) for row in cursor.fetchall()]
        backup_data["tables"]["orchestrators"] = orchestrators
        
        # Backup feature flags
        cursor.execute("SELECT key, value FROM system_config")
        configs = {row['key']: row['value'] for row in cursor.fetchall()}
        backup_data["tables"]["system_config"] = configs
        
        # Backup gaming sessions
        cursor.execute("SELECT * FROM gaming_sessions")
        sessions = [dict(row) for row in cursor.fetchall()]
        backup_data["tables"]["gaming_sessions"] = sessions
        
        # Backup user access links
        cursor.execute("SELECT * FROM user_orchestrator_access")
        access_links = [dict(row) for row in cursor.fetchall()]
        backup_data["tables"]["user_orchestrator_access"] = access_links
        
        cursor.execute("SELECT * FROM server_links")
        server_links = [dict(row) for row in cursor.fetchall()]
        backup_data["tables"]["server_links"] = server_links
        
        conn.close()
        
        # Create zip file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(backup_data, f, indent=2)
            temp_json = f.name
        
        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(temp_json, 'backup_data.json')
        
        os.unlink(temp_json)
        
        # Log backup creation
        AuditService.log(
            user_id=current_user['id'],
            username=current_user['username'],
            action_type='create',
            category='system',
            target_type='backup',
            target_id=backup_filename,
            details=f"Created backup: {backup_filename}",
            ip_address=request.client.host if request.client else None
        )
        
        file_size = os.path.getsize(backup_path)
        return {
            "success": True,
            "filename": backup_filename,
            "size": file_size,
            "size_human": f"{file_size / 1024 / 1024:.2f} MB",
            "tables_backed_up": list(backup_data["tables"].keys())
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")


@router.get("/download/{filename}")
async def download_backup(
    filename: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Download a backup file"""
    ensure_backup_dir()
    
    # Sanitize filename
    if '..' in filename or '/' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    filepath = os.path.join(BACKUP_DIR, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Backup not found")
    
    def iterfile():
        with open(filepath, 'rb') as f:
            while chunk := f.read(8192):
                yield chunk
    
    return StreamingResponse(
        iterfile(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.delete("/{filename}")
async def delete_backup(
    filename: str,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Delete a backup file"""
    ensure_backup_dir()
    
    # Sanitize filename
    if '..' in filename or '/' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    filepath = os.path.join(BACKUP_DIR, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Backup not found")
    
    os.unlink(filepath)
    
    # Log backup deletion
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='delete',
        category='system',
        target_type='backup',
        target_id=filename,
        details=f"Deleted backup: {filename}",
        ip_address=request.client.host if request.client else None
    )
    
    return {"success": True, "message": f"Backup {filename} deleted"}


@router.post("/restore/{filename}")
async def restore_backup(
    filename: str,
    options: RestoreOptions,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Restore from a backup file"""
    ensure_backup_dir()
    
    # Sanitize filename
    if '..' in filename or '/' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    filepath = os.path.join(BACKUP_DIR, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Backup not found")
    
    try:
        # Extract and read backup data
        with zipfile.ZipFile(filepath, 'r') as zipf:
            with zipf.open('backup_data.json') as f:
                backup_data = json.load(f)
        
        conn = get_db()
        cursor = conn.cursor()
        
        restored_items = []
        
        # Restore orchestrators
        if options.restore_orchestrators and 'orchestrators' in backup_data['tables']:
            for orch in backup_data['tables']['orchestrators']:
                # Check if orchestrator exists
                cursor.execute("SELECT id FROM orchestrators WHERE id = ?", (orch['id'],))
                if not cursor.fetchone():
                    cursor.execute('''
                        INSERT INTO orchestrators (id, name, base_url, description, created_at)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (orch['id'], orch['name'], orch['base_url'], 
                          orch.get('description', ''), orch.get('created_at', datetime.now(timezone.utc).isoformat())))
                    restored_items.append(f"orchestrator:{orch['name']}")
        
        # Restore settings
        if options.restore_settings and 'system_config' in backup_data['tables']:
            for key, value in backup_data['tables']['system_config'].items():
                cursor.execute('''
                    INSERT OR REPLACE INTO system_config (key, value)
                    VALUES (?, ?)
                ''', (key, value))
            restored_items.append("system_config")
        
        # Restore gaming sessions
        if options.restore_sessions and 'gaming_sessions' in backup_data['tables']:
            for session in backup_data['tables']['gaming_sessions']:
                cursor.execute("SELECT id FROM gaming_sessions WHERE id = ?", (session['id'],))
                if not cursor.fetchone():
                    cursor.execute('''
                        INSERT INTO gaming_sessions (id, title, description, orchestrator_id, 
                            server_uid, scheduled_time, duration_minutes, created_by, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (session['id'], session['title'], session.get('description', ''),
                          session.get('orchestrator_id'), session.get('server_uid'),
                          session['scheduled_time'], session.get('duration_minutes', 120),
                          session['created_by'], session.get('created_at')))
                    restored_items.append(f"session:{session['title']}")
        
        conn.commit()
        conn.close()
        
        # Log restore
        AuditService.log(
            user_id=current_user['id'],
            username=current_user['username'],
            action_type='restore',
            category='system',
            target_type='backup',
            target_id=filename,
            details=f"Restored from backup: {filename}, items: {len(restored_items)}",
            ip_address=request.client.host if request.client else None
        )
        
        return {
            "success": True,
            "message": f"Restored {len(restored_items)} items from backup",
            "restored_items": restored_items
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")


@router.post("/upload")
async def upload_backup(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_admin_user)
):
    """Upload a backup file"""
    ensure_backup_dir()
    
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only .zip files are allowed")
    
    # Sanitize filename
    safe_filename = file.filename.replace('..', '').replace('/', '_')
    filepath = os.path.join(BACKUP_DIR, safe_filename)
    
    try:
        # Save uploaded file
        with open(filepath, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        # Validate it's a valid backup
        with zipfile.ZipFile(filepath, 'r') as zipf:
            if 'backup_data.json' not in zipf.namelist():
                os.unlink(filepath)
                raise HTTPException(status_code=400, detail="Invalid backup file: missing backup_data.json")
            
            with zipf.open('backup_data.json') as f:
                data = json.load(f)
                if 'version' not in data or 'tables' not in data:
                    os.unlink(filepath)
                    raise HTTPException(status_code=400, detail="Invalid backup format")
        
        file_size = os.path.getsize(filepath)
        return {
            "success": True,
            "filename": safe_filename,
            "size": file_size,
            "size_human": f"{file_size / 1024 / 1024:.2f} MB"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(filepath):
            os.unlink(filepath)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
