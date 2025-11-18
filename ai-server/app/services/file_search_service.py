"""
File Search Service for AI Server - Using Gemini File Search API

This service handles chat queries using Gemini File Search tool.
Uses the new google-genai SDK (not google-generativeai) for File Search support.
"""

from google import genai
from google.genai import types
from ..core.config import settings
from typing import AsyncGenerator, Iterable, Optional
import logging

logger = logging.getLogger(__name__)


class QuotaExceededError(RuntimeError):
    """Raised when Gemini reports quota exhaustion."""


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
        self.file_search_enabled = bool(self.file_search_store_name)

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

    def _build_tools_config(self) -> Optional[list[types.Tool]]:
        if not self.file_search_enabled or not self.file_search_store_name:
            return None
        return [
            types.Tool(
                file_search=types.FileSearch(
                    file_search_store_names=[self.file_search_store_name]
                )
            )
        ]

    def _extract_text_from_chunk(self, chunk) -> Optional[str]:
        """Normalize chunk text from different response formats."""
        if not chunk:
            return None

        if hasattr(chunk, "text") and chunk.text:
            return chunk.text

        if hasattr(chunk, "candidates") and chunk.candidates:
            for candidate in chunk.candidates:
                content = getattr(candidate, "content", None)
                if content and getattr(content, "parts", None):
                    for part in content.parts:
                        part_text = getattr(part, "text", None)
                        if part_text:
                            return part_text

        if isinstance(chunk, str):
            return chunk

        return None

    def _stream_response_text(self, response: Iterable) -> Iterable[str]:
        if not response:
            return
        for chunk in response:
            chunk_text = self._extract_text_from_chunk(chunk)
            if chunk_text:
                yield chunk_text

    def _is_store_error(self, message: str) -> bool:
        lowered = message.lower()
        return any(
            keyword in lowered
            for keyword in [
                "file search store",
                "permission management",
                "does not exist",
                "invalid_argument",
            ]
        )

    def _is_overloaded_error(self, message: str) -> bool:
        lowered = message.lower()
        return any(
            keyword in lowered for keyword in ["503", "unavailable", "overloaded"]
        )

    def _log_store_misconfiguration_help(self):
        logger.warning(
            "Please verify File Search configuration:\n"
            "1. Store exists and name is correct (format: fileSearchStores/<store-id>).\n"
            "2. GEMINI_API_KEY has permission to access the store.\n"
            "3. Store already has uploaded/imported files."
        )

    def _is_quota_error(self, message: str) -> bool:
        lowered = message.lower()
        return any(
            keyword in lowered
            for keyword in [
                "quota",
                "exceed",
                "rate limit",
                "429",
                "resource exhausted",
                "insufficient tokens",
                "usage limits",
            ]
        )

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
            use_file_search = chatbot_type != "debate" and self.file_search_enabled

            # Prepare generation config - keep temperature low & cap output tokens
            generation_config = {
                "temperature": 0.4,
                "candidate_count": 1,
                "max_output_tokens": 1024,
            }

            # Prepare tools (File Search for learning and qa)
            # According to docs: https://ai.google.dev/gemini-api/docs/file-search
            # Use the new google-genai SDK format: types.Tool with types.FileSearch
            tools_config = self._build_tools_config() if use_file_search else None
            if tools_config:
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
                        temperature=generation_config.get("temperature", 0.4),
                        candidate_count=generation_config.get("candidate_count", 1),
                        max_output_tokens=generation_config.get(
                            "max_output_tokens", 1024
                        ),
                        tools=tools_config,
                    ),
                )

                for chunk_text in self._stream_response_text(response):
                    yield chunk_text
            except Exception as api_error:
                error_str = str(api_error)
                if use_file_search and self._is_store_error(error_str):
                    logger.error(
                        "File Search Store error: %s. Store name: %s. "
                        "Disabling File Search and retrying with LLM-only mode.",
                        error_str,
                        self.file_search_store_name or "<unset>",
                    )
                    self._log_store_misconfiguration_help()
                    # Disable file search until configuration fixed
                    self.file_search_enabled = False

                    try:
                        fallback_response = self.client.models.generate_content_stream(
                            model=self.model_name,
                            contents=full_prompt,
                            config=types.GenerateContentConfig(
                                temperature=generation_config.get("temperature", 0.4),
                                candidate_count=generation_config.get(
                                    "candidate_count", 1
                                ),
                                max_output_tokens=generation_config.get(
                                    "max_output_tokens", 1024
                                ),
                                tools=None,
                            ),
                        )
                        for chunk_text in self._stream_response_text(fallback_response):
                            yield chunk_text
                    except Exception as fallback_error:
                        raise RuntimeError(
                            f"Không thể trả lời vì File Search chưa được cấu hình đúng: {fallback_error}"
                        ) from fallback_error
                elif self._is_quota_error(error_str):
                    logger.error("Gemini quota exceeded: %s", error_str)
                    raise QuotaExceededError(
                        "Không thể sử dụng thêm vì quá giới hạn sử dụng AI, vui lòng chờ trong giây lát rồi thử lại."
                    ) from api_error
                elif self._is_overloaded_error(error_str):
                    logger.error("Gemini service unavailable: %s", error_str)
                    raise RuntimeError(
                        "Gemini đang quá tải, vui lòng thử lại sau vài phút."
                    ) from api_error
                else:
                    logger.exception("Gemini API error: %s", error_str)
                    raise RuntimeError(
                        "Không thể kết nối tới Gemini. Chi tiết: " + error_str
                    ) from api_error

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
