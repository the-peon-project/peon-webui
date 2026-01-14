from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import timedelta
import uuid
from datetime import datetime, timezone

from core.database import get_db, dict_from_row
from core.security import (
    verify_password, get_password_hash, create_access_token, 
    get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
)
from core.config import ROLE_PERMISSIONS
from models.user import UserLogin, Token, PasswordChange
from services.audit import AuditService

router = APIRouter(prefix="/auth")

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, request: Request):
    """Authenticate user and return token"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (credentials.username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_dict = dict_from_row(user)
    
    if not verify_password(credentials.password, user_dict['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    access_token = create_access_token(
        data={"sub": user_dict['id']},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Log login
    ip = request.client.host if request.client else None
    AuditService.log(
        user_id=user_dict['id'],
        username=user_dict['username'],
        action_type='login',
        category='auth',
        details='User logged in',
        ip_address=ip
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_dict['id'],
            "username": user_dict['username'],
            "email": user_dict['email'],
            "role": user_dict['role'],
            "is_chat_banned": bool(user_dict.get('is_chat_banned', 0)),
            "created_at": user_dict['created_at']
        }
    }

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user['id'],
        "username": current_user['username'],
        "email": current_user['email'],
        "role": current_user['role'],
        "is_chat_banned": bool(current_user.get('is_chat_banned', 0)),
        "created_at": current_user['created_at']
    }

@router.post("/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Refresh the access token"""
    access_token = create_access_token(
        data={"sub": current_user['id']},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": current_user['id'],
            "username": current_user['username'],
            "email": current_user['email'],
            "role": current_user['role'],
            "is_chat_banned": bool(current_user.get('is_chat_banned', 0)),
            "created_at": current_user['created_at']
        }
    }

@router.get("/permissions")
async def get_permissions(current_user: dict = Depends(get_current_user)):
    """Get permissions for current user's role"""
    role = current_user.get('role', 'user')
    permissions = ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS['user'])
    return {
        "role": role,
        "permissions": permissions
    }

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Change current user's password"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify current password
    if password_data.current_password:
        if not verify_password(password_data.current_password, current_user['password_hash']):
            conn.close()
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(password_data.new_password) < 8:
        conn.close()
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Update password
    new_hash = get_password_hash(password_data.new_password)
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, current_user['id']))
    conn.commit()
    conn.close()
    
    # Log password change
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='update',
        category='auth',
        target_type='user',
        target_id=current_user['id'],
        details='Password changed'
    )
    
    return {"message": "Password changed successfully"}
