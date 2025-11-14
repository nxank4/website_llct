from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    is_active: bool = True
    is_instructor: bool = False
    email_verified: bool = False
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    student_code: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_instructor: Optional[bool] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    student_code: Optional[str] = None
    password: Optional[str] = None


class UserInDBBase(UserBase):
    id: UUID
    is_superuser: bool
    email_verified: bool = False
    roles: Optional[List[str]] = None  # Add roles field
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class User(UserInDBBase):
    pass


class UserInDB(UserInDBBase):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
