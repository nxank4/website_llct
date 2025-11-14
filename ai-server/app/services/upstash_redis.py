"""
Upstash Redis Service

This service uses the official Upstash Redis Python client library.
This is ideal for serverless environments like Cloud Run where
persistent connections are not recommended.

Upstash Redis:
- Uses HTTP requests instead of TCP connections
- No connection pooling needed
- Perfect for serverless environments
- Official Python client library
"""

import hashlib
import logging
from typing import Optional
from upstash_redis import Redis
from ..core.config import settings

logger = logging.getLogger(__name__)


class UpstashRedisService:
    """Upstash Redis client using official Python library"""
    
    def __init__(self):
        self.rest_url = settings.UPSTASH_REDIS_REST_URL
        self.rest_token = settings.UPSTASH_REDIS_REST_TOKEN
        
        if not self.rest_url or not self.rest_token:
            logger.warning("Upstash Redis credentials not configured")
            self.enabled = False
            self.redis = None
        else:
            try:
                self.redis = Redis(url=self.rest_url, token=self.rest_token)
                self.enabled = True
                logger.info("Upstash Redis service initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Upstash Redis: {e}")
                self.enabled = False
                self.redis = None
    
    def _hash_query(self, query: str) -> str:
        """Hash query string to create cache key"""
        return hashlib.sha256(query.encode()).hexdigest()
    
    def get_cache(self, key: str) -> Optional[str]:
        """Get cached value by key"""
        if not self.enabled or not self.redis:
            return None
        
        try:
            result = self.redis.get(key)
            if result:
                # Redis returns bytes or string, convert to string
                if isinstance(result, bytes):
                    return result.decode('utf-8')
                return str(result)
            return None
        except Exception as e:
            logger.error(f"Error getting cache {key}: {e}")
            return None
    
    def set_cache(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        """Set cache value with optional TTL"""
        if not self.enabled or not self.redis:
            return False
        
        try:
            if ttl:
                # SET key value EX ttl (in seconds)
                result = self.redis.set(key, value, ex=ttl)
            else:
                # SET key value (no expiration)
                result = self.redis.set(key, value)
            
            return result == "OK" or result is True
        except Exception as e:
            logger.error(f"Error setting cache {key}: {e}")
            return False
    
    def delete_cache(self, key: str) -> bool:
        """Delete cache value by key"""
        if not self.enabled or not self.redis:
            return False
        
        try:
            result = self.redis.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Error deleting cache {key}: {e}")
            return False
    
    def get_chat_cache(self, query: str) -> Optional[str]:
        """Get cached chat response for a query"""
        cache_key = f"chat:{self._hash_query(query)}"
        return self.get_cache(cache_key)
    
    def set_chat_cache(self, query: str, response: str, ttl: Optional[int] = None) -> bool:
        """Cache chat response for a query"""
        cache_key = f"chat:{self._hash_query(query)}"
        ttl = ttl or settings.CACHE_TTL_SECONDS
        return self.set_cache(cache_key, response, ttl)
    
    def is_connected(self) -> bool:
        """Check if Upstash Redis is connected"""
        if not self.enabled or not self.redis:
            return False
        
        try:
            # Ping Upstash Redis
            result = self.redis.ping()
            return result == "PONG" or result is True
        except Exception as e:
            logger.error(f"Upstash Redis ping failed: {e}")
            return False


# Global instance
upstash_redis = UpstashRedisService()

