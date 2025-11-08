from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from ..core.database import Base

# Note: Material class is defined in app.models.content
# Note: ChatMessage class is defined in app.models.chat


class RAGEmbedding(Base):
    """RAG-specific embeddings with vector search support"""
    __tablename__ = "rag_embeddings"

    id = Column(Integer, primary_key=True)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"), index=True, nullable=False)
    vector = Column(Vector(384))
    chunk_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to Material in content.py
    material = relationship("Material", foreign_keys=[material_id])


