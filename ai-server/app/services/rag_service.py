"""
RAG Service for AI Server - Optimized with LangChain

This service handles Retrieval-Augmented Generation (RAG) queries
using LangChain to connect Supabase (pgvector) and Gemini.
"""

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from supabase import create_client, Client
from ..core.config import settings
from typing import AsyncGenerator, List, Tuple
import logging
import time
from google.api_core.exceptions import ResourceExhausted

logger = logging.getLogger(__name__)


class RagService:
    """
    RAG Service optimized with LangChain,
    connecting Supabase (pgvector) and Gemini.
    """

    def __init__(self):
        # 1. Initialize Supabase client for LangChain
        # Check if required settings are configured
        supabase_url = getattr(settings, "SUPABASE_URL", "") or ""
        supabase_publishable_key = (
            getattr(settings, "SUPABASE_PUBLISHABLE_KEY", "") or ""
        )

        if not supabase_url or not supabase_publishable_key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured. "
                "Please check your .env file or environment variables."
            )

        self.supabase_client: Client = create_client(
            supabase_url, supabase_publishable_key
        )

        # 2. Initialize Embedding model (Gemini API)
        # This will be used to create vectors for queries and documents
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY must be configured")

        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=settings.GEMINI_API_KEY or "",  # type: ignore
        )

        # 3. Initialize LLM (Gemini Chat API)
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL_CHAT or "gemini-2.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.5,
            convert_system_message_to_human=True,
        )

        # 4. Initialize Vector Store (where RAG will search)
        # LangChain will automatically call pgvector via this client
        self.vector_store = SupabaseVectorStore(
            client=self.supabase_client,
            embedding=self.embeddings,
            table_name="material_embeddings",  # Your vector table name
            query_name="match_documents",  # Your pgvector RPC function name
        )

        # 5. Define Prompt Templates for different chatbot types (using LCEL)
        # Learning chatbot: RAG-based with educational materials
        self.learning_prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """Bạn là Chatbot Học Tập, một trợ lý AI chuyên giúp sinh viên học tập.
Nhiệm vụ của bạn:
- Giải thích các khái niệm, bài học một cách dễ hiểu
- Hướng dẫn làm bài tập, giải đề
- Cung cấp ví dụ minh họa và bài tập thực hành
- Sử dụng thông tin trong phần "Ngữ cảnh" để trả lời chính xác

Chỉ sử dụng các thông tin trong phần "Ngữ cảnh" dưới đây để trả lời câu hỏi.
Nếu câu hỏi không liên quan đến ngữ cảnh, hãy nói "Tôi không thể trả lời câu hỏi này dựa trên tài liệu được cung cấp."
Hãy trả lời bằng tiếng Việt, rõ ràng và dễ hiểu.

Ngữ cảnh:
{context}""",
                ),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{question}"),
            ]
        )

        # Debate chatbot: LLM-only with debate-focused prompt (no RAG needed)
        self.debate_prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """Bạn là Chatbot Debate, một trợ lý AI chuyên về tranh luận và phân tích quan điểm.
Nhiệm vụ của bạn:
- Giúp sinh viên tranh luận về các chủ đề học tập
- Phân tích các quan điểm khác nhau một cách khách quan
- Đưa ra lập luận ủng hộ và phản đối
- Hướng dẫn cách xây dựng lập luận logic và thuyết phục
- Thảo luận về các chủ đề liên quan đến môn học

Hãy trả lời bằng tiếng Việt, khách quan và logic. Khuyến khích sinh viên suy nghĩ phản biện.""",
                ),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{question}"),
            ]
        )

        # Q&A chatbot: RAG-based with FAQ/guidance materials
        self.qa_prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """Bạn là Chatbot Q&A, một trợ lý AI chuyên trả lời câu hỏi về hệ thống và khóa học.
Nhiệm vụ của bạn:
- Trả lời các câu hỏi về thông tin khóa học, lịch thi, quy định
- Hướng dẫn sử dụng hệ thống, các tính năng
- Cung cấp thông tin về quy trình, thủ tục
- Sử dụng thông tin trong phần "Ngữ cảnh" để trả lời chính xác

Chỉ sử dụng các thông tin trong phần "Ngữ cảnh" dưới đây để trả lời câu hỏi.
Nếu câu hỏi không liên quan đến ngữ cảnh, hãy nói "Tôi không thể trả lời câu hỏi này dựa trên tài liệu được cung cấp."
Hãy trả lời bằng tiếng Việt, ngắn gọn và chính xác.

Ngữ cảnh:
{context}""",
                ),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{question}"),
            ]
        )

        # 6. Fallback prompt (when RAG fails due to quota)
        self.fallback_prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "Bạn là một trợ lý AI hữu ích cho sinh viên. Hãy trả lời câu hỏi một cách hữu ích và chính xác bằng tiếng Việt.",
                ),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{question}"),
            ]
        )

    async def get_rag_response_stream(
        self,
        query: str,
        chat_history: List[Tuple[str, str]] | None = None,
        chatbot_type: str = "learning",
    ) -> AsyncGenerator[str, None]:
        """
        Main async function to get RAG response and stream using LCEL.

        Args:
            query: User's question
            chat_history: Chat history [(user_msg, ai_msg), ...]
            chatbot_type: Type of chatbot - "learning", "debate", or "qa"
        """
        start_time = time.time()
        if chat_history is None:
            chat_history = []

        # 1. Convert chat history to LangChain messages (do this first for fallback)
        messages = []
        for human_msg, ai_msg in chat_history:
            messages.append(HumanMessage(content=human_msg))
            messages.append(AIMessage(content=ai_msg))

        # 2. Select prompt based on chatbot type
        chatbot_type = chatbot_type.lower() if chatbot_type else "learning"

        # Debate chatbot: LLM-only (no RAG needed)
        if chatbot_type == "debate":
            try:
                logger.debug(
                    f"Starting Debate chatbot query processing for: {query[:50]}..."
                )
                debate_chain = (
                    {
                        "question": RunnablePassthrough(),
                        "chat_history": lambda x: messages,
                    }
                    | self.debate_prompt
                    | self.llm
                    | StrOutputParser()
                )

                first_chunk_time = None
                async for chunk in debate_chain.astream(query):
                    if chunk:
                        if first_chunk_time is None:
                            first_chunk_time = time.time()
                            time_to_first_chunk = first_chunk_time - start_time
                            logger.debug(
                                f"Debate chatbot - Time to first chunk: {time_to_first_chunk:.2f}s"
                            )
                        yield chunk
                return
            except Exception as e:
                logger.error(f"Error in Debate chatbot: {e}", exc_info=True)
                yield f"Xin lỗi, đã có lỗi xảy ra: {e}"
                return

        # Learning and Q&A chatbots: RAG-based
        try:
            logger.debug(
                f"Starting RAG query processing for {chatbot_type} chatbot: {query[:50]}..."
            )
            # 3. Create retriever
            retriever = self.vector_store.as_retriever(
                search_type="similarity", search_kwargs={"k": settings.RAG_TOP_K}
            )

            # 4. Format documents function
            def format_docs(docs):
                return "\n\n".join(doc.page_content for doc in docs)

            # 5. Select prompt based on chatbot type
            if chatbot_type == "qa":
                selected_prompt = self.qa_prompt
            else:  # Default to learning
                selected_prompt = self.learning_prompt

            # 6. Create RAG chain using LCEL
            rag_chain = (
                {
                    "context": retriever | format_docs,
                    "question": RunnablePassthrough(),
                    "chat_history": lambda x: messages,
                }
                | selected_prompt
                | self.llm
                | StrOutputParser()
            )

            # 7. Stream response
            first_chunk_time = None
            async for chunk in rag_chain.astream(query):
                if chunk:
                    if first_chunk_time is None:
                        first_chunk_time = time.time()
                        time_to_first_chunk = first_chunk_time - start_time
                        logger.debug(
                            f"{chatbot_type} chatbot - Time to first chunk: {time_to_first_chunk:.2f}s"
                        )
                    yield chunk

        except (ResourceExhausted, Exception) as e:
            # Check if it's a quota error
            error_str = str(e)
            is_quota_error = (
                "429" in error_str
                or "quota" in error_str.lower()
                or "ResourceExhausted" in str(type(e))
            )

            if is_quota_error:
                logger.warning(
                    f"Gemini embedding quota exceeded for {chatbot_type} chatbot, falling back to LLM-only mode"
                )
                # Fallback to LLM-only (no RAG) when embedding quota is exhausted
                # Use appropriate prompt based on chatbot type
                fallback_prompt = self.fallback_prompt
                if chatbot_type == "debate":
                    fallback_prompt = self.debate_prompt
                elif chatbot_type == "qa":
                    # For Q&A, use a simplified Q&A prompt without context
                    fallback_prompt = ChatPromptTemplate.from_messages(
                        [
                            (
                                "system",
                                "Bạn là Chatbot Q&A, một trợ lý AI chuyên trả lời câu hỏi về hệ thống và khóa học. Hãy trả lời câu hỏi một cách hữu ích và chính xác bằng tiếng Việt.",
                            ),
                            MessagesPlaceholder(variable_name="chat_history"),
                            ("human", "{question}"),
                        ]
                    )
                elif chatbot_type == "learning":
                    # For Learning, use a simplified learning prompt without context
                    fallback_prompt = ChatPromptTemplate.from_messages(
                        [
                            (
                                "system",
                                "Bạn là Chatbot Học Tập, một trợ lý AI chuyên giúp sinh viên học tập. Hãy giải thích các khái niệm, hướng dẫn làm bài tập một cách dễ hiểu bằng tiếng Việt.",
                            ),
                            MessagesPlaceholder(variable_name="chat_history"),
                            ("human", "{question}"),
                        ]
                    )

                fallback_start = time.time()
                try:
                    logger.debug(
                        f"Initializing fallback LLM chain for {chatbot_type} chatbot..."
                    )
                    fallback_chain = (
                        {
                            "question": RunnablePassthrough(),
                            "chat_history": lambda x: messages,
                        }
                        | fallback_prompt
                        | self.llm
                        | StrOutputParser()
                    )
                    logger.debug(
                        f"Starting fallback LLM streaming for {chatbot_type} chatbot..."
                    )
                    first_fallback_chunk = None
                    async for chunk in fallback_chain.astream(query):
                        if chunk:
                            if first_fallback_chunk is None:
                                first_fallback_chunk = time.time()
                                time_to_first = first_fallback_chunk - fallback_start
                                logger.debug(
                                    f"Fallback LLM ({chatbot_type}) - Time to first chunk: {time_to_first:.2f}s"
                                )
                            yield chunk
                except Exception as fallback_error:
                    logger.error(
                        f"Fallback LLM also failed for {chatbot_type} chatbot: {fallback_error}"
                    )
                    yield "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau."
            else:
                logger.error(
                    f"Error in RAG Chain for {chatbot_type} chatbot: {e}", exc_info=True
                )
                yield f"Xin lỗi, đã có lỗi xảy ra: {e}"


# Initialize singleton instance for API endpoint (lazy initialization)
# Don't initialize on import to avoid errors if env vars are not loaded yet
_rag_service_instance: RagService | None = None


def get_rag_service() -> RagService:
    """Get or create RAG service instance (lazy initialization)"""
    global _rag_service_instance
    if _rag_service_instance is None:
        _rag_service_instance = RagService()
    return _rag_service_instance


# For backward compatibility - use getter function
# This will be initialized when first accessed
class _RagServiceProxy:
    """Proxy class for lazy initialization"""

    def __getattr__(self, name):
        return getattr(get_rag_service(), name)


rag_service = _RagServiceProxy()
