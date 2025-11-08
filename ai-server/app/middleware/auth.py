"""
JWT Authentication Middleware for AI Server

This middleware verifies JWT tokens from Supabase/NextAuth.
Unlike the main server, this doesn't need RLS hooks since
it only queries vector embeddings (not user-specific data).
"""

from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from typing import Optional
import logging
from ..core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()


class AuthMiddleware:
    """JWT Authentication Middleware for AI Server"""
    
    def __init__(self):
        self.secret_key = settings.SUPABASE_JWT_SECRET
        self.algorithm = settings.ALGORITHM
        
        if not self.secret_key:
            logger.warning("SUPABASE_JWT_SECRET is not configured. JWT verification will fail.")
    
    def verify_token(self, token: str) -> Optional[str]:
        """Verify JWT token and return user ID as string"""
        if not self.secret_key:
            return None
        
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id = payload.get("sub")
            token_type = payload.get("type")

            # Supabase JWT may not have 'type' field. Accept if 'sub' exists.
            if user_id and (token_type == "access" or token_type is None):
                # Return as string to support both UUID and integer IDs
                return str(user_id)
            return None

        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            return None
    
    def get_user_id_from_token(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ) -> str:
        """Get user ID from JWT token"""
        token = credentials.credentials
        user_id = self.verify_token(token)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_id


# Global auth instance
auth_middleware = AuthMiddleware()

# Common dependency
get_user_id_from_token = auth_middleware.get_user_id_from_token

