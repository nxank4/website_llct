from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Tuple
from sentence_transformers import SentenceTransformer


class RagService:
    def __init__(self) -> None:
        self.embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    def search_similar(
        self, db: Session, query_embedding: List[float], limit: int = 5
    ) -> List[Tuple[str, float]]:
        # Sử dụng pgvector cosine distance (<->) trong Postgres
        sql = text(
            """
            SELECT chunk_text, 1 - (vector <=> :vec) AS score
            FROM embeddings
            ORDER BY vector <-> :vec
            LIMIT :limit
            """
        )
        rows = db.execute(sql, {"vec": query_embedding, "limit": limit}).all()
        return [(r[0], float(r[1])) for r in rows]

    def get_relevant_context(
        self, db: Session, query_embedding: List[float], limit: int = 5
    ) -> str:
        chunks = self.search_similar(db, query_embedding, limit)
        return "\n\n".join([c for c, _ in chunks])

    def get_relevant_context_from_text(
        self, db: Session, text_query: str, limit: int = 5
    ) -> str:
        emb = self.embedder.encode([text_query])[0].tolist()
        return self.get_relevant_context(db, emb, limit)
