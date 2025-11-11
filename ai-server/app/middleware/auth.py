"""
JWT Authentication Middleware for AI Server

This middleware verifies JWT tokens from Supabase/NextAuth.
Unlike the main server, this doesn't need RLS hooks since
it only queries vector embeddings (not user-specific data).
"""

from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt, jwk
import json
import time
import requests
from typing import Optional
import logging
from ..core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()


class AuthMiddleware:
    """JWT Authentication Middleware for AI Server"""

    def __init__(self):
        # Supabase has migrated from Legacy JWT Secret to new JWT Signing Keys
        # Only JWKS URL is needed for asymmetric key verification (RS256/ES256)
        self.jwks_url = getattr(settings, "SUPABASE_JWKS_URL", "") or ""
        self._jwks_cache: dict | None = None
        self._jwks_cache_exp: float = 0.0

        if not self.jwks_url:
            logger.warning(
                "No JWT verification configured. Set SUPABASE_JWKS_URL for asymmetric key verification (RS256/ES256)."
            )
        else:
            logger.info(f"JWKS URL configured: {self.jwks_url}")

    def _get_jwks(self) -> dict | None:
        """Fetch and cache JWKS for 10 minutes."""
        if not self.jwks_url:
            return None
        now = time.time()
        if self._jwks_cache and now < self._jwks_cache_exp:
            return self._jwks_cache
        try:
            resp = requests.get(self.jwks_url, timeout=5)
            resp.raise_for_status()
            self._jwks_cache = resp.json()
            self._jwks_cache_exp = now + 600  # 10 minutes
            return self._jwks_cache
        except Exception as e:
            logger.warning(f"Failed to fetch JWKS: {e}")
            return None

    def _get_key_from_jwks(self, token: str):
        """Resolve proper key from JWKS by kid"""
        jwks = self._get_jwks()
        if not jwks:
            return None, None
        try:
            header = jwt.get_unverified_header(token)
        except Exception as e:
            logger.warning(f"Failed to parse JWT header: {e}")
            return None, None
        kid = header.get("kid")
        alg = header.get("alg")
        # HS256 tokens won't have kid; skip JWKS
        if not kid:
            return None, None
        if not kid or not alg:
            return None, None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                try:
                    kty = key.get("kty")
                    if kty == "RSA":
                        # For RSA keys (RS256/RS384/RS512)
                        try:
                            # Use jose.jwk to construct RSA key from JWK
                            key_obj = jwk.construct(key, algorithm=alg)
                            logger.debug(
                                f"✅ RSA key resolved (kty={kty}, alg={alg}, kid={kid})"
                            )
                            return key_obj, alg
                        except Exception as e:
                            logger.warning(f"Failed to parse RSA key from JWKS: {e}")
                            return None, None
                    elif kty == "EC":
                        # For EC keys (ES256/ES384/ES512)
                        # Key format: {"kty": "EC", "crv": "P-256", "x": "...", "y": "...", "alg": "ES256", "kid": "..."}
                        try:
                            # Use jose.jwk to construct EC key from JWK
                            key_obj = jwk.construct(key, algorithm=alg)
                            logger.debug(
                                f"✅ EC key resolved (kty={kty}, crv={key.get('crv')}, alg={alg}, kid={kid})"
                            )
                            return key_obj, alg
                        except Exception as e:
                            logger.warning(f"Failed to parse EC key from JWKS: {e}")
                            return None, None
                    else:
                        logger.warning(f"Unsupported JWKS kty: {kty}")
                        return None, None
                except Exception as e:
                    logger.warning(f"Failed to build key from JWK: {e}")
                    return None, None
        return None, None

    def verify_token(self, token: str) -> Optional[str]:
        """
        Verify JWT token and return user ID as string.

        Supabase has migrated from Legacy JWT Secret (HS256) to new JWT Signing Keys (RS256/ES256).
        Only RS256/ES256 tokens are supported, verified using JWKS (SUPABASE_JWKS_URL).
        """
        try:
            # Step 1: Read token header to detect algorithm
            try:
                header = jwt.get_unverified_header(token)
                token_alg = header.get("alg", "").upper()
                token_kid = header.get("kid")
            except Exception as e:
                logger.warning(f"Failed to parse JWT header: {e}")
                raise JWTError("Invalid JWT header")

            # Step 2: Route to appropriate verification method based on algorithm
            # Note: Supabase has migrated from Legacy JWT Secret (HS256) to new JWT Signing Keys (RS256/ES256)
            # Only RS256/ES256 tokens are supported now, verified using JWKS
            if token_alg == "HS256":
                raise JWTError(
                    "HS256 tokens are no longer supported. Supabase has migrated to RS256/ES256 signing keys. "
                    "Please ensure SUPABASE_JWKS_URL is configured and your Supabase project has migrated to RS256/ES256."
                )
            elif token_alg in ["RS256", "ES256", "RS384", "ES384", "RS512", "ES512"]:
                # RS256/ES256: Use JWKS for asymmetric key verification
                if not self.jwks_url:
                    raise JWTError(
                        f"{token_alg} token received but no JWKS URL configured. "
                        "Set SUPABASE_JWKS_URL to verify asymmetric tokens."
                    )

                logger.debug(f"Token uses {token_alg}, verifying with JWKS")
                key_obj, algo = self._get_key_from_jwks(token)

                if not key_obj or not algo:
                    raise JWTError(
                        f"Failed to resolve JWKS key for {token_alg} token. "
                        f"kid={token_kid}, JWKS URL={self.jwks_url}"
                    )

                logger.debug(f"✅ JWKS key resolved (alg={algo}, kid={token_kid})")
                payload = jwt.decode(
                    token, key_obj, algorithms=[algo], options={"verify_aud": False}
                )

            else:
                raise JWTError(
                    f"Unsupported JWT algorithm: {token_alg}. "
                    "Supported: HS256, RS256, ES256"
                )

            # Step 3: Extract user ID from payload
            user_id = payload.get("sub")
            token_type = payload.get("type")

            # Supabase JWT may not have 'type' field. Accept if 'sub' exists.
            if user_id and (token_type == "access" or token_type is None):
                # Return as string to support both UUID and integer IDs
                return str(user_id)
            return None

        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            try:
                header = jwt.get_unverified_header(token)
                logger.debug(
                    f"Token header: alg={header.get('alg')} kid={header.get('kid')}"
                )
                # Decode payload without verification to see what's inside
                import base64

                parts = token.split(".")
                if len(parts) >= 2:
                    try:
                        payload_json = base64.urlsafe_b64decode(parts[1] + "==")
                        payload_data = json.loads(payload_json)
                        logger.debug(
                            f"Token payload (unverified): sub={payload_data.get('sub')}, "
                            f"type={payload_data.get('type')}, exp={payload_data.get('exp')}, "
                            f"iat={payload_data.get('iat')}"
                        )
                    except Exception as decode_err:
                        logger.debug(f"Failed to decode token payload: {decode_err}")
            except Exception:
                logger.debug("Failed to read JWT header for debugging")
            # Don't log configured secrets on failure (only log successful ones)
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
