from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import timedelta

from core.database import get_db, dict_from_row
from core.security import (
    verify_password, get_password_hash, create_access_token, 
    get_current_user, get_current_admin_user, ACCESS_TOKEN_EXPIRE_MINUTES
)
from core.config import ROLE_PERMISSIONS
from models.user import UserCreate, UserLogin, Token, PasswordChange
from services.audit import AuditService
from services.user import UserService

router = APIRouter(prefix="/auth")


def _token_response(user: dict, access_token: str) -> dict:
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "role": user['role'],
            "is_chat_banned": bool(user.get('is_chat_banned', 0)),
            "created_at": user['created_at']
        }
    }

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

    return _token_response(user_dict, access_token)

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
    
    return _token_response(current_user, access_token)


@router.post("/register")
async def register_user(
    user_data: UserCreate,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Create a new user via the legacy auth namespace.

    This preserves older clients/tests that still post to /api/auth/register
    while keeping admin-only creation semantics.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE username = ?", (user_data.username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")

    cursor.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already exists")

    conn.close()

    user = UserService.create_user(
        username=user_data.username,
        email=user_data.email,
        password=user_data.password,
        role=user_data.role,
    )

    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='create',
        category='user',
        target_type='user',
        target_id=user['id'],
        details=f"Created user via auth register: {user_data.username} with role: {user_data.role}",
        ip_address=request.client.host if request.client else None,
    )

    return user

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
