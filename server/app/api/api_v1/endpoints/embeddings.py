from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ....core.database import get_db
from ....services.embeddings_service import embeddings_service


router = APIRouter()


class IndexRequest(BaseModel):
    title: str
    content: str


@router.post("/index")
def index_material(req: IndexRequest, db: Session = Depends(get_db)):
    try:
        material_id = embeddings_service.index_material(db, req.title, req.content)
        return {"material_id": material_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


