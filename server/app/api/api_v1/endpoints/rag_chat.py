from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from ....core.database import get_db
from ....services.rag_service import RagService
from ....ai.gemini_client import gemini_client
from sentence_transformers import SentenceTransformer


router = APIRouter()
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
rag = RagService()


class ChatRequest(BaseModel):
    message: str


@router.post("/stream")
def chat_stream(req: ChatRequest, db: Session = Depends(get_db)):
    try:
        emb = embedder.encode([req.message])[0].tolist()
        contexts = rag.search_similar(db, emb, limit=5)
        context_text = "\n\n".join([c for c, _ in contexts])

        def generate():
            for chunk in gemini_client.generate_streaming_response(req.message, context=context_text):
                yield chunk

        return StreamingResponse(generate(), media_type="text/plain", headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


