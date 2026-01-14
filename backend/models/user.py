from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "user"

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_chat_banned: Optional[bool] = None

class User(BaseModel):
    id: str
    username: str
    email: str
    role: str
    is_chat_banned: bool = False
    created_at: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class PasswordChange(BaseModel):
    current_password: Optional[str] = None  # Not required for admin reset
    new_password: str
