from sqlalchemy.orm import Session
from typing import List
from sentence_transformers import SentenceTransformer
from ..models.rag import Material, Embedding


class EmbeddingsService:
    def __init__(self):
        # Dùng model 384d khớp config
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    def chunk_text(self, text: str, max_tokens: int = 256) -> List[str]:
        # Cắt thô theo đoạn; có thể thay bằng tokenizer theo nhu cầu
        paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
        chunks: List[str] = []
        buf = []
        for p in paragraphs:
            buf.append(p)
            joined = " ".join(buf)
            if len(joined) > max_tokens:
                chunks.append(" ".join(buf[:-1]))
                buf = [p]
        if buf:
            chunks.append(" ".join(buf))
        return chunks

    def index_material(self, db: Session, title: str, content: str) -> int:
        material = Material(title=title, content=content)
        db.add(material)
        db.flush()

        chunks = self.chunk_text(content)
        embeddings = self.model.encode(chunks).tolist()

        for vec, chunk in zip(embeddings, chunks):
            db.add(Embedding(material_id=material.id, vector=vec, chunk_text=chunk))

        db.commit()
        return material.id


embeddings_service = EmbeddingsService()


