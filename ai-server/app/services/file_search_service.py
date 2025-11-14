"""
File Search Service for AI Server - Using Gemini File Search API

This service handles chat queries using Gemini File Search tool.
Uses the new google-genai SDK (not google-generativeai) for File Search support.
"""

from google import genai
from google.genai import types
from ..core.config import settings
from typing import AsyncGenerator
import logging

logger = logging.getLogger(__name__)


class FileSearchService:
    """
    File Search Service using Gemini File Search API.
    Uses the new google-genai SDK for proper File Search support.
    """

    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY must be configured")

        # Initialize client with new SDK
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

        self.model_name = settings.GEMINI_MODEL_CHAT or "gemini-2.5-flash"
        self.file_search_store_name = settings.FILE_SEARCH_STORE_NAME or ""

        logger.info(f"FileSearchService initialized with model: {self.model_name}")
        if self.file_search_store_name:
            logger.info(f"File Search Store: {self.file_search_store_name}")
        else:
            logger.warning(
                "FILE_SEARCH_STORE_NAME not configured - File Search will be disabled"
            )

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
            # Use the new google-genai SDK format: types.Tool with types.FileSearch
            tools_config = None
            if use_file_search and self.file_search_store_name:
                # Use File Search tool with new SDK format
                tools_config = [
                    types.Tool(
                        file_search=types.FileSearch(
                            file_search_store_names=[self.file_search_store_name]
                        )
                    )
                ]
                logger.debug("File Search tool configured using types.Tool")

            # Combine system prompt with user message
            full_prompt = f"{system_prompt}\n\nCâu hỏi của người dùng: {message}"

            logger.info(
                f"Generating response for {chatbot_type} chatbot (File Search: {use_file_search})"
            )

            # Generate content with streaming using new SDK
            # Use client.models.generate_content_stream for streaming
            # According to docs: https://ai.google.dev/gemini-api/docs/file-search
            try:
                response = self.client.models.generate_content_stream(
                    model=self.model_name,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(
                        temperature=generation_config.get("temperature", 0.5),
                        tools=tools_config if tools_config else None,
                    ),
                )

                # Stream chunks from response
                # The new SDK returns an iterable of chunks
                if response:
                    for chunk in response:
                        # Extract text from chunk - handle different chunk formats
                        chunk_text = None

                        # Try to get text directly from chunk
                        if hasattr(chunk, "text") and chunk.text:
                            chunk_text = chunk.text
                        # Try to get text from candidates
                        elif hasattr(chunk, "candidates") and chunk.candidates:
                            for candidate in chunk.candidates:
                                if hasattr(candidate, "content") and candidate.content:
                                    content = candidate.content
                                    if hasattr(content, "parts") and content.parts:
                                        for part in content.parts:
                                            if hasattr(part, "text") and part.text:
                                                chunk_text = part.text
                                                break
                                if chunk_text:
                                    break
                        # Fallback: if chunk is a string
                        elif isinstance(chunk, str):
                            chunk_text = chunk

                        if chunk_text:
                            yield chunk_text
            except Exception as api_error:
                error_str = str(api_error)
                # Check if it's a File Search Store error
                if (
                    "does not exist" in error_str
                    or "permission management" in error_str
                    or "INVALID_ARGUMENT" in error_str
                ):
                    logger.error(
                        f"File Search Store error: {error_str}. "
                        f"Store name: {self.file_search_store_name}. "
                        "Falling back to LLM-only mode (no File Search)."
                    )
                    logger.warning(
                        "Please verify: "
                        "1. File Search Store exists and name is correct (format: fileSearchStores/your-store-name). "
                        "2. API key has permission to access the File Search Store. "
                        "3. File Search Store has files uploaded."
                    )

                    # Fallback to LLM-only mode (no File Search)
                    try:
                        logger.info(
                            "Retrying without File Search tool (LLM-only mode)..."
                        )
                        fallback_response = self.client.models.generate_content_stream(
                            model=self.model_name,
                            contents=full_prompt,
                            config=types.GenerateContentConfig(
                                temperature=generation_config.get("temperature", 0.5),
                                tools=None,  # No tools - LLM only
                            ),
                        )

                        if fallback_response:
                            for chunk in fallback_response:
                                chunk_text = None
                                if hasattr(chunk, "text") and chunk.text:
                                    chunk_text = chunk.text
                                elif hasattr(chunk, "candidates") and chunk.candidates:
                                    for candidate in chunk.candidates:
                                        if (
                                            hasattr(candidate, "content")
                                            and candidate.content
                                        ):
                                            content = candidate.content
                                            if (
                                                hasattr(content, "parts")
                                                and content.parts
                                            ):
                                                for part in content.parts:
                                                    if (
                                                        hasattr(part, "text")
                                                        and part.text
                                                    ):
                                                        chunk_text = part.text
                                                        break
                                elif isinstance(chunk, str):
                                    chunk_text = chunk

                                if chunk_text:
                                    yield chunk_text
                    except Exception as fallback_error:
                        logger.error(
                            f"Fallback LLM-only mode also failed: {fallback_error}"
                        )
                        raise
                else:
                    # Re-raise other errors
                    raise

        except Exception as e:
            logger.error(f"Error in get_chat_response_stream: {e}")
            raise


# Singleton instance - with error handling
_init_error = None
try:
    file_search_service = FileSearchService()
except Exception as e:
    _init_error = str(e)
    logger.error(f"Failed to initialize FileSearchService: {e}")
    logger.error("Please check GEMINI_API_KEY and FILE_SEARCH_STORE_NAME configuration")

    # Create a dummy service that will raise errors when used
    class DummyFileSearchService:
        async def get_chat_response_stream(self, *args, **kwargs):
            raise RuntimeError(f"FileSearchService not initialized: {_init_error}")

    file_search_service = DummyFileSearchService()
