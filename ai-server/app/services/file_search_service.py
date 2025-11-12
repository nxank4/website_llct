"""
File Search Service for AI Server - Using Gemini File Search API

This service handles chat queries using Gemini File Search tool.
Simplified architecture without LangChain or pgvector.
"""

import google.generativeai as genai
from ..core.config import settings
from typing import AsyncGenerator, List, Optional
import logging
import time

logger = logging.getLogger(__name__)


class FileSearchService:
    """
    File Search Service using Gemini File Search API.
    """

    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY must be configured")
        
        # Configure Gemini API
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        self.model_name = settings.GEMINI_MODEL_CHAT or "gemini-2.5-flash"
        self.file_search_store_name = settings.FILE_SEARCH_STORE_NAME or ""
        
        # Initialize model
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
        )
        
        logger.info(f"FileSearchService initialized with model: {self.model_name}")
        if self.file_search_store_name:
            logger.info(f"File Search Store: {self.file_search_store_name}")
        else:
            logger.warning("FILE_SEARCH_STORE_NAME not configured - File Search will be disabled")

    def get_prompt_for_type(self, chatbot_type: str) -> str:
        """Get system prompt based on chatbot type"""
        if chatbot_type == "debate":
            return """Bạn là Chatbot Tranh Luận, một trợ lý AI chuyên tạo ra các cuộc tranh luận và phân tích đa chiều.
Nhiệm vụ của bạn:
- Đưa ra các quan điểm đối lập về một chủ đề
- Phân tích ưu và nhược điểm của từng quan điểm
- Khuyến khích người dùng suy nghĩ sâu sắc và phản biện
- Không cần sử dụng tài liệu cụ thể, tập trung vào lý luận logic

Hãy trả lời bằng tiếng Việt, rõ ràng và có tính tranh luận."""
        
        elif chatbot_type == "qa":
            return """Bạn là Chatbot Hỏi Đáp, một trợ lý AI chuyên trả lời câu hỏi dựa trên tài liệu.
Nhiệm vụ của bạn:
- Trả lời câu hỏi dựa trên thông tin trong tài liệu được cung cấp
- Cung cấp câu trả lời chính xác và ngắn gọn
- Nếu không tìm thấy thông tin, hãy nói rõ

Hãy trả lời bằng tiếng Việt, rõ ràng và chính xác."""
        
        else:  # learning (default)
            return """Bạn là Chatbot Học Tập, một trợ lý AI chuyên giúp sinh viên học tập.
Nhiệm vụ của bạn:
- Giải thích các khái niệm, bài học một cách dễ hiểu
- Hướng dẫn làm bài tập, giải đề
- Cung cấp ví dụ minh họa và bài tập thực hành
- Sử dụng thông tin trong tài liệu được cung cấp để trả lời chính xác

Hãy trả lời bằng tiếng Việt, rõ ràng và dễ hiểu."""

    async def get_chat_response_stream(
        self,
        message: str,
        chatbot_type: str = "learning",
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat response using Gemini File Search.
        
        Args:
            message: User's message
            chatbot_type: Type of chatbot ("learning", "debate", "qa")
        
        Yields:
            Text chunks from the model
        """
        try:
            # Get appropriate prompt for chatbot type
            system_prompt = self.get_prompt_for_type(chatbot_type)
            
            # For debate chatbot, don't use File Search (LLM-only)
            use_file_search = chatbot_type != "debate"
            
            # Prepare generation config
            generation_config = {
                "temperature": 0.5,
            }
            
            # Prepare tools (File Search for learning and qa)
            # According to docs: https://ai.google.dev/gemini-api/docs/file-search
            tools = None
            if use_file_search and self.file_search_store_name:
                # Use File Search tool
                # Format: tools=[{"file_search": {"file_search_store_names": [store_name]}}]
                tools = [
                    {
                        "file_search": {
                            "file_search_store_names": [self.file_search_store_name]
                        }
                    }
                ]
            
            # Combine system prompt with user message
            full_prompt = f"{system_prompt}\n\nCâu hỏi của người dùng: {message}"
            
            logger.info(f"Generating response for {chatbot_type} chatbot (File Search: {use_file_search})")
            
            # Generate content with streaming
            # Note: The exact API may vary based on google-generativeai version
            # This is a simplified approach - may need adjustment based on actual SDK
            response = self.model.generate_content(
                full_prompt,
                generation_config=generation_config,
                tools=tools if tools else None,
                stream=True,
            )
            
            # Stream chunks
            for chunk in response:
                if hasattr(chunk, 'text') and chunk.text:
                    yield chunk.text
                elif isinstance(chunk, str):
                    yield chunk
                    
        except Exception as e:
            logger.error(f"Error in get_chat_response_stream: {e}")
            raise


# Singleton instance - with error handling
try:
    file_search_service = FileSearchService()
except Exception as e:
    logger.error(f"Failed to initialize FileSearchService: {e}")
    logger.error("Please check GEMINI_API_KEY and FILE_SEARCH_STORE_NAME configuration")
    # Create a dummy service that will raise errors when used
    class DummyFileSearchService:
        async def get_chat_response_stream(self, *args, **kwargs):
            raise RuntimeError(f"FileSearchService not initialized: {e}")
    file_search_service = DummyFileSearchService()

