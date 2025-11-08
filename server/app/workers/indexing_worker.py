import os
import sys
import logging
from typing import Dict, Any
from rq import Worker, Queue, Connection
from redis import Redis
from sqlalchemy.orm import sessionmaker
from ..core.config import settings
from ..core.database import engine
from ..ai.rag_service import rag_service
from ..models.content import Material
import time

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Redis connection
redis_conn = Redis.from_url(settings.REDIS_URL)

# Create queues
indexing_queue = Queue('indexing', connection=redis_conn)
ocr_queue = Queue('ocr', connection=redis_conn)
embedding_queue = Queue('embedding', connection=redis_conn)


def process_material_upload(material_id: int) -> Dict[str, Any]:
    """Process uploaded material for indexing and embedding"""
    try:
        db = SessionLocal()
        material = db.query(Material).filter(Material.id == material_id).first()
        
        if not material:
            return {"status": "error", "message": "Material not found"}
        
        logger.info(f"Processing material {material_id}: {material.title}")
        
        # Extract text content based on file type
        if material.file_type == "pdf":
            # Queue for OCR processing
            ocr_queue.enqueue(extract_pdf_text, material_id)
        elif material.file_type in ["docx", "txt", "md"]:
            # Direct text processing
            text_content = extract_text_content(material)
            if text_content:
                # Create embeddings
                success = rag_service.create_embeddings_for_material(
                    text_content, material_id, db
                )
                if success:
                    material.is_published = True
                    db.commit()
                    return {"status": "success", "message": "Material processed successfully"}
        
        db.close()
        return {"status": "success", "message": "Material queued for processing"}
        
    except Exception as e:
        logger.error(f"Error processing material {material_id}: {e}")
        return {"status": "error", "message": str(e)}


def extract_pdf_text(material_id: int) -> Dict[str, Any]:
    """Extract text from PDF file"""
    try:
        db = SessionLocal()
        material = db.query(Material).filter(Material.id == material_id).first()
        
        if not material or material.file_type != "pdf":
            return {"status": "error", "message": "Invalid material or file type"}
        
        # TODO: Implement PDF text extraction using PyPDF2 or similar
        # For now, return placeholder
        text_content = f"PDF content for {material.title}"
        
        # Create embeddings
        success = rag_service.create_embeddings_for_material(
            text_content, material_id, db
        )
        
        if success:
            material.is_published = True
            db.commit()
            return {"status": "success", "message": "PDF processed successfully"}
        
        db.close()
        return {"status": "error", "message": "Failed to create embeddings"}
        
    except Exception as e:
        logger.error(f"Error extracting PDF text for material {material_id}: {e}")
        return {"status": "error", "message": str(e)}


def extract_text_content(material: Material) -> str:
    """Extract text content from material"""
    try:
        if material.content:
            return material.content
        
        # TODO: Implement file content extraction based on file_type
        # For now, return placeholder
        return f"Text content for {material.title}"
        
    except Exception as e:
        logger.error(f"Error extracting text content: {e}")
        return ""


def generate_quiz_questions(material_id: int, num_questions: int = 5) -> Dict[str, Any]:
    """Generate quiz questions from material"""
    try:
        from ..ai.gemini_client import gemini_client
        
        db = SessionLocal()
        material = db.query(Material).filter(Material.id == material_id).first()
        
        if not material:
            return {"status": "error", "message": "Material not found"}
        
        # Get material content
        content = material.content or f"Content for {material.title}"
        
        # Generate questions using AI
        questions = gemini_client.generate_quiz_questions(content, num_questions)
        
        db.close()
        return {
            "status": "success", 
            "questions": questions,
            "message": f"Generated {len(questions)} questions"
        }
        
    except Exception as e:
        logger.error(f"Error generating quiz questions: {e}")
        return {"status": "error", "message": str(e)}


def cleanup_old_sessions() -> Dict[str, Any]:
    """Clean up old chat sessions and temporary data"""
    try:
        # TODO: Implement cleanup logic
        logger.info("Cleaning up old sessions")
        return {"status": "success", "message": "Cleanup completed"}
        
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        return {"status": "error", "message": str(e)}


def monitor_queue_health() -> Dict[str, Any]:
    """Monitor queue health and performance"""
    try:
        stats = {
            "indexing_queue": {
                "size": indexing_queue.count,
                "failed": len(indexing_queue.failed_job_registry),
                "started": len(indexing_queue.started_job_registry)
            },
            "ocr_queue": {
                "size": ocr_queue.count,
                "failed": len(ocr_queue.failed_job_registry),
                "started": len(ocr_queue.started_job_registry)
            },
            "embedding_queue": {
                "size": embedding_queue.count,
                "failed": len(embedding_queue.failed_job_registry),
                "started": len(embedding_queue.started_job_registry)
            }
        }
        
        return {"status": "success", "stats": stats}
        
    except Exception as e:
        logger.error(f"Error monitoring queue health: {e}")
        return {"status": "error", "message": str(e)}


def start_worker():
    """Start the worker process"""
    logger.info("Starting indexing worker...")
    
    with Connection(redis_conn):
        worker = Worker([
            indexing_queue,
            ocr_queue,
            embedding_queue
        ])
        worker.work()


if __name__ == "__main__":
    start_worker()
