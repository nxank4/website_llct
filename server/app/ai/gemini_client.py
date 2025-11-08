from google import genai  # type: ignore[import-not-found]
from typing import List, Dict, Any, Optional, Generator
import json
import logging
from ..core.config import settings

logger = logging.getLogger(__name__)


class GeminiClient:
    def __init__(self):
        # Configure via settings / environment
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured. Set it in your .env")
        # The client gets the API key from the environment variable `GEMINI_API_KEY`
        # or we can set it explicitly
        self.client = genai.Client(api_key=api_key)
        self.chat_model_name = settings.GEMINI_MODEL_CHAT or "gemini-2.5-flash"
        self.complex_model_name = settings.GEMINI_MODEL_COMPLEX or "gemini-2.5-pro"


    def generate_chat_response(
        self, prompt: str, context: Optional[str] = None, subject: Optional[str] = None
    ) -> str:
        """Generate a chat response with context and subject filtering"""
        try:
            # Build system prompt with guardrails
            system_prompt = self._build_system_prompt(context, subject)
            full_prompt = f"{system_prompt}\n\nUser: {prompt}"

            response = self.client.models.generate_content(
                model=self.chat_model_name, contents=full_prompt
            )

            # Check if response was blocked
            if hasattr(response, "prompt_feedback") and response.prompt_feedback and hasattr(response.prompt_feedback, "block_reason") and response.prompt_feedback.block_reason:
                return "I cannot provide a response to this request as it may violate our content policies."

            return response.text

        except Exception as e:
            logger.error(f"Error generating chat response: {e}")
            return "I'm sorry, I encountered an error while processing your request."

    def generate_streaming_response(
        self, prompt: str, context: Optional[str] = None, subject: Optional[str] = None
    ) -> Generator[str, None, None]:
        """Generate streaming response for real-time chat"""
        try:
            system_prompt = self._build_system_prompt(context, subject)
            full_prompt = f"{system_prompt}\n\nUser: {prompt}"

            # Streaming response with new API
            response = self.client.models.generate_content_stream(
                model=self.chat_model_name, contents=full_prompt
            )

            for chunk in response:
                if hasattr(chunk, "text") and chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error(f"Error generating streaming response: {e}")
            yield "I'm sorry, I encountered an error while processing your request."

    def generate_quiz_questions(
        self, material_content: str, num_questions: int = 5, difficulty: str = "medium"
    ) -> List[Dict[str, Any]]:
        """Generate quiz questions from material content"""
        try:
            prompt = f"""
            Generate {num_questions} quiz questions based on the following material.
            Difficulty level: {difficulty}
            
            Material:
            {material_content}
            
            Return the questions in JSON format with the following structure:
            [
                {{
                    "question": "Question text",
                    "type": "multiple_choice",
                    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                    "correct_answer": "Option 1",
                    "explanation": "Explanation of the correct answer",
                    "difficulty": 1-5
                }}
            ]
            
            Question types: multiple_choice, true_false, short_answer
            """

            response = self.client.models.generate_content(
                model=self.complex_model_name, contents=prompt
            )

            # Parse JSON response
            questions = json.loads(response.text)
            return questions

        except Exception as e:
            logger.error(f"Error generating quiz questions: {e}")
            return []

    def generate_debate_topic(self, subject: str) -> Dict[str, Any]:
        """Generate a debate topic for a subject"""
        try:
            prompt = f"""
            Generate a debate topic for the subject: {subject}
            
            Return in JSON format:
            {{
                "topic": "Debate topic statement",
                "description": "Brief description of the topic",
                "for_arguments": ["Argument 1", "Argument 2", "Argument 3"],
                "against_arguments": ["Counter-argument 1", "Counter-argument 2", "Counter-argument 3"],
                "difficulty": "beginner|intermediate|advanced"
            }}
            """

            response = self.client.models.generate_content(
                model=self.complex_model_name, contents=prompt
            )

            return json.loads(response.text)

        except Exception as e:
            logger.error(f"Error generating debate topic: {e}")
            return {}

    def socratic_questioning(self, user_response: str, context: str) -> str:
        """Generate Socratic questioning based on user response"""
        try:
            prompt = f"""
            You are a Socratic teacher. The student provided this response:
            "{user_response}"
            
            Context: {context}
            
            Generate a thoughtful follow-up question that will help the student think deeper about the topic.
            The question should be open-ended and encourage critical thinking.
            """

            response = self.client.models.generate_content(
                model=self.chat_model_name, contents=prompt
            )

            return response.text

        except Exception as e:
            logger.error(f"Error generating Socratic question: {e}")
            return "That's an interesting perspective. Can you tell me more about your reasoning?"

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
            base_prompt += f"\n- Use this context to inform your responses: {context}"

        return base_prompt

    def validate_response_quality(self, response: str, context: str) -> Dict[str, Any]:
        """Validate the quality and accuracy of AI response"""
        try:
            prompt = f"""
            Evaluate this AI response for educational quality and accuracy:
            
            Response: {response}
            Context: {context}
            
            Return JSON with:
            {{
                "is_accurate": true/false,
                "is_helpful": true/false,
                "confidence_score": 0.0-1.0,
                "issues": ["list of any issues found"],
                "suggestions": ["suggestions for improvement"]
            }}
            """

            validation_response = self.client.models.generate_content(
                model=self.chat_model_name, contents=prompt
            )

            return json.loads(validation_response.text)

        except Exception as e:
            logger.error(f"Error validating response: {e}")
            return {
                "is_accurate": True,
                "is_helpful": True,
                "confidence_score": 0.5,
                "issues": [],
                "suggestions": [],
            }


# Global instance
gemini_client = GeminiClient()
