"""
Gemini Client for AI Server

This client handles interactions with Google Gemini API,
including streaming responses for real-time chat.
"""

from google import genai
from typing import Optional, Generator
import logging
from ..core.config import settings

logger = logging.getLogger(__name__)


class GeminiClient:
    """Gemini AI Client"""

    def __init__(self):
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured. Set it in your .env")

        # Try new API first (google-genai)
        try:
            self.client = genai.Client(api_key=api_key)
            self.use_new_api = True
        except (AttributeError, TypeError):
            # Fallback to old API (google-generativeai)
            genai.configure(api_key=api_key)
            self.client = None
            self.use_new_api = False

        self.chat_model_name = settings.GEMINI_MODEL_CHAT or "gemini-2.5-flash"
        self.complex_model_name = settings.GEMINI_MODEL_COMPLEX or "gemini-2.5-pro"

    def generate_streaming_response(
        self, prompt: str, context: Optional[str] = None, subject: Optional[str] = None
    ) -> Generator[str, None, None]:
        """
        Generate streaming response for real-time chat.

        Args:
            prompt: User's question/prompt
            context: Relevant context from RAG retrieval
            subject: Subject/topic context

        Yields:
            Text chunks from Gemini API
        """
        try:
            system_prompt = self._build_system_prompt(context, subject)
            full_prompt = f"{system_prompt}\n\nUser: {prompt}"

            if self.use_new_api:
                # New API (google-genai)
                response = self.client.models.generate_content_stream(
                    model=self.chat_model_name, contents=full_prompt
                )

                for chunk in response:
                    if hasattr(chunk, "text") and chunk.text:
                        yield chunk.text
            else:
                # Old API (google-generativeai)
                model = genai.GenerativeModel(self.chat_model_name)
                response = model.generate_content(full_prompt, stream=True)

                for chunk in response:
                    if hasattr(chunk, "text") and chunk.text:
                        yield chunk.text

        except Exception as e:
            logger.error(f"Error generating streaming response: {e}")
            yield "I'm sorry, I encountered an error while processing your request."

    def _build_system_prompt(
        self, context: Optional[str] = None, subject: Optional[str] = None
    ) -> str:
        """Build system prompt with guardrails and context"""
        base_prompt = """
        You are an AI teaching assistant for an e-learning platform. Your role is to:
        1. Help students learn and understand concepts
        2. Provide educational support and guidance
        3. Encourage critical thinking and learning
        4. Stay within the educational context
        
        Guidelines:
        - Only discuss topics related to education and learning
        - Do not help with cheating, plagiarism, or academic dishonesty
        - Do not provide answers to tests or assignments directly
        - Encourage students to think and learn independently
        - Be helpful, patient, and encouraging
        """

        if subject:
            base_prompt += f"\n- Focus on the subject: {subject}"

        if context:
            base_prompt += f"\n\nUse this context to inform your responses:\n{context}"

        return base_prompt


# Global instance
gemini_client = GeminiClient()
