"""
RAG Service for AI Server

This service handles Retrieval-Augmented Generation (RAG) queries
using pgvector for similarity search on Supabase PostgreSQL.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Tuple
from sentence_transformers import SentenceTransformer
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)


class RagService:
    """RAG Service for vector similarity search"""
    
    def __init__(self) -> None:
        self.embedder = SentenceTransformer(settings.EMBEDDING_MODEL)
    
    def search_similar(
        self, db: Session, query_embedding: List[float], limit: int = None
    ) -> List[Tuple[str, float]]:
        """
        Search for similar chunks using pgvector cosine distance.
        
        Args:
            db: SQLAlchemy database session
            query_embedding: Query embedding vector
            limit: Maximum number of results (defaults to RAG_TOP_K)
        
        Returns:
            List of tuples (chunk_text, similarity_score)
        """
        limit = limit or settings.RAG_TOP_K
        
        try:
            # Use pgvector cosine distance (<->) in Postgres
            # Note: embedding column is stored as JSON string, need to cast to vector
            sql = text(
                """
                SELECT chunk_text, 1 - (embedding::vector <=> :vec::vector) AS score
                FROM material_embeddings
                WHERE 1 - (embedding::vector <=> :vec::vector) >= :threshold
                ORDER BY embedding::vector <-> :vec::vector
                LIMIT :limit
                """
            )
            
            # Convert embedding list to PostgreSQL array format
            vec_str = "[" + ",".join(map(str, query_embedding)) + "]"
            
            rows = db.execute(
                sql,
                {
                    "vec": vec_str,
                    "limit": limit,
                    "threshold": settings.SIMILARITY_THRESHOLD
                }
            ).all()
            
            return [(r[0], float(r[1])) for r in rows]
            
        except Exception as e:
            logger.error(f"Error in vector search: {e}")
            return []
    
    def get_relevant_context(
        self, db: Session, query_embedding: List[float], limit: int = None
    ) -> str:
        """
        Get relevant context chunks as a single string.
        
        Args:
            db: SQLAlchemy database session
            query_embedding: Query embedding vector
            limit: Maximum number of chunks (defaults to RAG_TOP_K)
        
        Returns:
            Combined context string from relevant chunks
        """
        chunks = self.search_similar(db, query_embedding, limit)
        return "\n\n".join([c for c, _ in chunks])
    
    def get_relevant_context_from_text(
        self, db: Session, text_query: str, limit: int = None
    ) -> str:
        """
        Get relevant context from a text query.
        
        Args:
            db: SQLAlchemy database session
            text_query: Text query string
            limit: Maximum number of chunks (defaults to RAG_TOP_K)
        
        Returns:
            Combined context string from relevant chunks
        """
        try:
            # Generate embedding for the query
            emb = self.embedder.encode([text_query])[0].tolist()
            return self.get_relevant_context(db, emb, limit)
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return ""

