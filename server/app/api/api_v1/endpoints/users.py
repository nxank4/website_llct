from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from ....core.database import get_db
from ....models.user import User
from ....schemas.user import User as UserSchema, UserCreate, UserUpdate
from ....middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# CRITICAL: Route "/me" MUST be defined BEFORE "/{user_id}" to avoid route conflicts
# FastAPI matches routes in order, so specific routes must come before parameterized routes
@router.get("/me", response_model=UserSchema)
def read_current_user(
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get current authenticated user
    """
    try:
        # Populate roles based on user flags
        roles = []
        if bool(current_user.is_superuser):
            roles.append("admin")
        if bool(current_user.is_instructor):
            roles.append("instructor")
        if not roles:
            roles.append("student")

        # Convert SQLAlchemy model to dict using model_dump if available
        # Otherwise, manually construct dict
        user_dict = {
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "full_name": current_user.full_name,
            "is_active": current_user.is_active,
            "is_superuser": current_user.is_superuser,
            "is_instructor": current_user.is_instructor,
            "email_verified": bool(current_user.email_verified) if hasattr(current_user, "email_verified") else False,
            "avatar_url": current_user.avatar_url,
            "bio": current_user.bio,
            "roles": roles,
            "created_at": current_user.created_at,
            "updated_at": getattr(current_user, "updated_at", None),  # Can be None
        }

        # Validate and create UserSchema object using model_validate
        user_data = UserSchema.model_validate(user_dict)

        return user_data
    except Exception as e:
        logger.error(f"Error in /me endpoint: {e}", exc_info=True)
        # Log the current_user object for debugging
        if current_user:
            logger.error(
                f"Current user: id={current_user.id}, email={current_user.email}"
            )
        # Return more detailed error information
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve user data: {str(e)}"
        )


@router.get("/", response_model=List[UserSchema])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve users
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserSchema)
def read_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
) -> Any:
    """
    Get a specific user by id
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    return user


@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
) -> Any:
    """
    Update a user
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )

    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        from ....core import security

        update_data["hashed_password"] = security.get_password_hash(
            update_data.pop("password")
        )

    for field, value in update_data.items():
        setattr(user, field, value)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserSchema)
def patch_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Partially update a user (PATCH method)
    Requires authentication - users can only update themselves unless they are admin
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    
    # Check permissions: users can only update themselves unless they are admin
    if not current_user.is_superuser and current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to update this user",
        )

    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        from ....core import security
        update_data["hashed_password"] = security.get_password_hash(
            update_data.pop("password")
        )

    for field, value in update_data.items():
        setattr(user, field, value)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete a user
    Requires authentication - only admin can delete users
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    
    # Only admin can delete users
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="Only admin can delete users",
        )
    
    # Prevent deleting admin users
    if user.is_superuser:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete admin users",
        )
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
