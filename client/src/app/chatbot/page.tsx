"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat, type ChatMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { getSession } from "next-auth/react";
import type { Session } from "next-auth";
import { AI_SERVER_CONFIG } from "@/lib/env";

import {
  ArrowUp,
  MessageSquare,
  GraduationCap,
  Smile,
  Star,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ClipboardType,
  ChevronLeft,
} from "lucide-react";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { useToast } from "@/contexts/ToastContext";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import ChatbotTypeCard from "@/components/chatbot/ChatbotTypeCard";
import DebateControls from "@/components/chatbot/DebateControls";

export default function ChatbotPage() {
  const [selectedType, setSelectedType] = useState("learning");
  const [inputMessage, setInputMessage] = useState("");
  const chatSectionRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState<"gemini-2.5-pro" | "gemini-2.5-flash">(
    "gemini-2.5-flash"
  );
  const [showModelMenu, setShowModelMenu] = useState(false);
  const modelButtonRef = useRef<HTMLButtonElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const [copiedMessage, setCopiedMessage] = useState<{
    id: string;
    type: "raw" | "formatted";
  } | null>(null);
  const [openCopyMenuId, setOpenCopyMenuId] = useState<string | null>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();
  const [errorMessages, setErrorMessages] = useState<Set<string>>(new Set());
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [debateMode, setDebateMode] = useState<"infinite" | "limited">(
    "infinite"
  );
  const [debateTurnLimit, setDebateTurnLimit] = useState(6);
  const [debateSummaryRequested, setDebateSummaryRequested] = useState(false);
  const [debateSummaryComplete, setDebateSummaryComplete] = useState(false);
  const [debateTopic, setDebateTopic] = useState("");
  const [debateTopicTouched, setDebateTopicTouched] = useState(false);
  const [activeDebateTopic, setActiveDebateTopic] = useState<string | null>(
    null
  );
  const [isStartingDebate, setIsStartingDebate] = useState(false);
  const assistantMessageCountRef = useRef(0);

  // Gọi trực tiếp AI Server
  // Sử dụng AI_SERVER_CONFIG để đảm bảo nhất quán và hỗ trợ development
  const apiUrl = `${AI_SERVER_CONFIG.BASE_URL}/api/v1/chat/stream`;

  // Debug log trong development để kiểm tra URL
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🤖 Chatbot API URL:", apiUrl);
      console.log("🔧 AI_SERVER_CONFIG:", AI_SERVER_CONFIG);
      console.log(
        "🌐 NEXT_PUBLIC_AI_SERVER_URL:",
        process.env.NEXT_PUBLIC_AI_SERVER_URL
      );
    }
  }, [apiUrl]);

  // Create transport with function-based headers - will get fresh token on each request
  // getSession() automatically refreshes token if expired (NextAuth auto-refresh flow)
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: apiUrl,
        headers: (async () => {
          // Get fresh session on-demand using getSession()
          // getSession() automatically refreshes token if expired (NextAuth auto-refresh flow)
          // This returns the latest RS256 token from Supabase (via CredentialsProvider)
          const session = await getSession();

          // IMPORTANT: Use Supabase RS256 token from NextAuth session
          // This token was obtained using Anon Key (SUPABASE_PUBLISHABLE_KEY) in CredentialsProvider
          // It's an RS256 token that can be verified via JWKS by ai-server
          const supabaseToken = (
            session as Session & { supabaseAccessToken?: string }
          )?.supabaseAccessToken;

          // Only use Supabase token from NextAuth session
          if (!supabaseToken) {
            console.warn(
              "No Supabase token found in NextAuth session. User might be logged out."
            );
            // Return undefined, onError will catch 401 error
            return undefined;
          }

          console.debug(
            "Using Supabase RS256 token from NextAuth session:",
            supabaseToken.substring(0, 20) + "..."
          );

          return { Authorization: `Bearer ${supabaseToken}` };
        }) as unknown as Record<string, string>,
        credentials: "include",
      }),
    [apiUrl]
  );

  const isDebateMode = selectedType === "debate";

  const resetDebateState = () => {
    setDebateSummaryRequested(false);
    setDebateSummaryComplete(false);
    setDebateTopic("");
    setDebateTopicTouched(false);
    setActiveDebateTopic(null);
    setIsStartingDebate(false);
  };

  const QUOTA_LIMIT_MESSAGE =
    "Không thể sử dụng thêm vì quá giới hạn sử dụng AI, vui lòng chờ trong giây lát rồi thử lại.";

  const { messages, sendMessage, isLoading, setMessages, stop } = useChat({
    transport,
    body: { model, type: selectedType },
    onError: (err) => {
      const errorMsg =
        err?.message &&
        err.message.toLowerCase().includes("giới hạn sử dụng ai")
          ? QUOTA_LIMIT_MESSAGE
          : err?.message || "Không thể kết nối đến server. Vui lòng thử lại.";
      // Show toast notification for error
      showToast({
        type: "error",
        title: "Yêu cầu thất bại",
        message: errorMsg,
        duration: 6000,
      });

      // Add error message to UI
      const errorId = `err-${Date.now()}`;
      const errorMessage: ChatMessage = {
        id: errorId,
        role: "assistant",
        content: `❌ **Lỗi:** ${errorMsg}`,
      };

      // Remove empty placeholder if exists and add error message
      const currentMessages = messages;
      const lastMsg = currentMessages[currentMessages.length - 1];
      if (
        lastMsg?.role === "assistant" &&
        (!lastMsg.content || lastMsg.content.trim().length === 0)
      ) {
        setMessages([...currentMessages.slice(0, -1), errorMessage]);
      } else {
        setMessages([...currentMessages, errorMessage]);
      }

      // Track error message
      setErrorMessages((prev) => new Set(prev).add(errorId));
    },
  });

  const debateTurns = useMemo(() => {
    if (!isDebateMode) return [];
    const rounds: Array<{ user?: ChatMessage; assistant?: ChatMessage }> = [];
    let current: { user?: ChatMessage; assistant?: ChatMessage } = {};
    messages.forEach((msg) => {
      if (msg.role === "user") {
        if (current.user || current.assistant) {
          rounds.push(current);
          current = {};
        }
        current = { user: msg };
      } else if (msg.role === "assistant") {
        if (current.user) {
          current.assistant = msg;
          rounds.push(current);
          current = {};
        } else {
          rounds.push({ assistant: msg });
        }
      }
    });
    if (current.user || current.assistant) {
      rounds.push(current);
    }
    return rounds;
  }, [isDebateMode, messages]);

  const assistantDebateTurns = useMemo(() => {
    if (!isDebateMode) return 0;
    return messages.filter((msg) => msg.role === "assistant").length;
  }, [isDebateMode, messages]);
  const debateLimitReached =
    isDebateMode &&
    debateMode === "limited" &&
    assistantDebateTurns >= debateTurnLimit;
  const debateInteractionLocked =
    isDebateMode &&
    (debateLimitReached || debateSummaryRequested || debateSummaryComplete);
  const debateHasStarted = isDebateMode && debateTurns.length > 0;
  const disableMessageInputForDebate = isDebateMode && !debateHasStarted;
  const debateWaitingForTopic = disableMessageInputForDebate;
  const showDebateWaitingCard =
    isDebateMode && isLoading && debateTurns.length === 0;

  // Track when loading finishes
  const prevIsLoadingRef = useRef(isLoading);
  useEffect(() => {
    prevIsLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (!isDebateMode) {
      assistantMessageCountRef.current = 0;
      return;
    }
    const count = messages.filter((msg) => msg.role === "assistant").length;
    if (debateSummaryRequested && count > assistantMessageCountRef.current) {
      setDebateSummaryRequested(false);
      setDebateSummaryComplete(true);
    }
    assistantMessageCountRef.current = count;
  }, [messages, isDebateMode, debateSummaryRequested]);

  const chatbotTypes = [
    {
      id: "learning",
      name: "CHATBOT HỌC TẬP",
      icon: GraduationCap,
      color: "bg-[#125093]",
      gradient: "from-[#125093] to-[#0f4278]",
      description:
        "Hỗ trợ học tập, giải thích khái niệm và hướng dẫn làm bài tập một cách chi tiết và dễ hiểu.",
    },
    {
      id: "debate",
      name: "CHATBOT DEBATE",
      icon: MessageSquare,
      color: "bg-[#00CBB8]",
      gradient: "from-[#00CBB8] to-[#00b8a8]",
      description:
        "Tranh luận và phân tích quan điểm về các chủ đề học tập, giúp phát triển tư duy phản biện.",
    },
    {
      id: "qa",
      name: "CHATBOT Q&A",
      icon: Star,
      color: "bg-[#29B9E7]",
      gradient: "from-[#29B9E7] to-[#1a9bc7]",
      description:
        "Trả lời câu hỏi về thông tin khóa học, lịch thi và hướng dẫn sử dụng hệ thống.",
    },
  ];

  // Auto scroll to bottom when new messages arrive *and* during streaming
  useEffect(() => {
    // We only want to auto-scroll if:
    // 1. The container exists
    // 2. The user isn't manually scrolling
    if (chatContainerRef.current && !isUserScrollingRef.current) {
      const container = chatContainerRef.current;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;

      // Only auto-scroll if user is already near the bottom.
      // This allows the user to scroll up to read previous messages
      // without being forced back down.
      if (isNearBottom) {
        // Use direct scrollTop assignment.
        // This is faster and more reliable for streaming than
        // requestAnimationFrame or smooth scrolling, which can lag.
        chatContainerRef.current.scrollTop =
          chatContainerRef.current.scrollHeight;
      }
    }
    // This dependency array is correct.
    // 'messages' changes on every stream chunk, triggering this effect.
    // 'isLoading' changes when the stream starts and stops.
  }, [messages, isLoading]);

  // Track user scroll behavior and show/hide scroll to bottom button
  // Unified effect to avoid stale state and conflicts
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    // 1. Hàm duy nhất để kiểm tra vị trí scroll
    const checkScrollPosition = () => {
      const scrollBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      // Dùng 100px cho nhất quán với logic auto-scroll
      const isAtBottom = scrollBottom < 100;
      const hasScrollableContent =
        container.scrollHeight > container.clientHeight;

      // Cập nhật state
      setShowScrollToBottom(!isAtBottom && hasScrollableContent);
    };

    // 2. Hàm xử lý khi user cuộn
    const handleScroll = () => {
      // Luôn luôn kiểm tra vị trí để ẩn/hiện nút
      checkScrollPosition();

      // Đánh dấu là user đang cuộn
      isUserScrollingRef.current = true;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      const scrollBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      const isAtBottom = scrollBottom < 100; // Dùng 100px

      if (isAtBottom) {
        // Nếu user cuộn xuống đáy, cho phép auto-scroll hoạt động trở lại sau 1 giây
        scrollTimeoutRef.current = setTimeout(() => {
          isUserScrollingRef.current = false;
        }, 1000);
      }
    };

    // 3. Gắn listener
    container.addEventListener("scroll", handleScroll, { passive: true });

    // 4. Kiểm tra vị trí 1 lần khi tin nhắn/loading thay đổi
    // Dùng timeout để chạy sau khi auto-scroll (nếu có) đã hoàn thành
    const checkTimeout = setTimeout(checkScrollPosition, 150);

    // 5. Hàm dọn dẹp
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      clearTimeout(checkTimeout);
    };
  }, [messages, isLoading]); // Quan trọng: Chạy lại mỗi khi tin nhắn hoặc trạng thái loading thay đổi

  // Debug: Log messages to see if streaming is working
  useEffect(() => {
    if (isLoading) {
      const assistantMessages = messages.filter(
        (msg) => msg.role === "assistant"
      );
      console.log("🔵 Loading state:", {
        isLoading,
        totalMessages: messages.length,
        assistantMessages: assistantMessages.length,
        lastAssistant:
          assistantMessages.length > 0
            ? {
                id: assistantMessages[assistantMessages.length - 1].id,
                content:
                  assistantMessages[assistantMessages.length - 1].content,
                parts: assistantMessages[assistantMessages.length - 1].parts,
                text: formatMessageText(
                  assistantMessages[assistantMessages.length - 1]
                ),
                textLength: formatMessageText(
                  assistantMessages[assistantMessages.length - 1]
                ).trim().length,
              }
            : null,
      });
    }
  }, [messages, isLoading]);

  // Auto scroll to chat section when type changes
  const scrollToChat = () => {
    if (chatSectionRef.current) {
      chatSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  // close model dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showModelMenu &&
        modelMenuRef.current &&
        !modelMenuRef.current.contains(target) &&
        modelButtonRef.current &&
        !modelButtonRef.current.contains(target)
      ) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showModelMenu]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // trigger submit through form
      const form = document.getElementById(
        "chat-form"
      ) as HTMLFormElement | null;
      form?.requestSubmit();
    }
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    resetDebateState();
    // Clear all messages when changing chatbot type
    setMessages([]);
    // Auto scroll to chat section
    setTimeout(scrollToChat, 100);
    setInputMessage("");
    stop?.();
  };

  const handleClearMessages = () => {
    // Stop any ongoing request
    stop?.();
    // Clear all messages
    setMessages([]);
    // Clear error messages tracking
    setErrorMessages(new Set());
    // Clear input
    setInputMessage("");
    resetDebateState();
    assistantMessageCountRef.current = 0;
  };

  const handleDebateModeChange = (mode: "infinite" | "limited") => {
    setDebateMode(mode);
    resetDebateState();
  };

  const handleDebateLimitChange = (value: number) => {
    if (Number.isNaN(value)) return;
    const sanitized = Math.min(20, Math.max(2, value));
    setDebateTurnLimit(sanitized);
    resetDebateState();
  };

  const handleRequestSummary = () => {
    if (!isDebateMode || debateSummaryRequested || debateSummaryComplete) {
      return;
    }
    setDebateSummaryRequested(true);
    const summaryPrompt =
      "Hãy đóng vai trọng tài, tổng kết và đánh giá cuộc tranh luận ở trên. Nêu rõ các luận điểm chính của cả hai bên, điểm mạnh/yếu và đưa khuyến nghị tiếp theo cho học sinh. Viết tiếng Việt ngắn gọn, có cấu trúc.";
    sendMessage(
      {
        role: "user",
        content: summaryPrompt,
      },
      {
        body: { model, type: "debate" },
      }
    );
  };

  const handleStartDebate = () => {
    setDebateTopicTouched(true);
    const topic = debateTopic.trim();
    if (
      !isDebateMode ||
      !topic ||
      isLoading ||
      isStartingDebate ||
      debateHasStarted
    ) {
      return;
    }
    setIsStartingDebate(true);
    try {
      const result = sendMessage(
        {
          role: "user",
          content: `Chúng ta hãy debate về chủ đề: "${topic}". Hãy đóng vai trò phản biện và đưa ra luận điểm sắc bén.`,
        },
        {
          body: { model, type: selectedType },
        }
      );
      setActiveDebateTopic(topic);
      setDebateTopic("");
      setDebateTopicTouched(false);
      Promise.resolve(result)
        .catch((error) => {
          console.error("Failed to start debate:", error);
        })
        .finally(() => setIsStartingDebate(false));
    } catch (error) {
      console.error("Failed to start debate:", error);
      setIsStartingDebate(false);
    }
  };

  const handleCopyMessage = async (
    messageId: string,
    messageText: string, // Đây là nội dung Markdown thô
    type: "raw" | "formatted"
  ) => {
    try {
      if (type === "formatted") {
        // --- Logic copy có định dạng (HTML) ---
        const contentElement = document.getElementById(
          `message-content-${messageId}`
        );
        if (!contentElement) {
          console.error("Không tìm thấy element nội dung tin nhắn.");
          throw new Error("Content element not found.");
        }

        // Sử dụng ClipboardItem API để copy rich text
        // Nó sẽ copy cả HTML và bản text thô (để fallback)
        const html = contentElement.innerHTML;
        const blobHtml = new Blob([html], { type: "text/html" });
        const blobText = new Blob([messageText], { type: "text/plain" });

        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobText,
          }),
        ]);
      } else {
        // --- Logic copy thô (Raw Text) ---
        await navigator.clipboard.writeText(messageText);
      }

      // Cập nhật state để hiển thị feedback
      setCopiedMessage({ id: messageId, type });

      // Reset state sau 2 giây
      setTimeout(() => {
        setCopiedMessage(null);
      }, 2000);
    } catch (err) {
      console.error("Lỗi sao chép tin nhắn:", err);
      showToast({
        type: "error",
        title: "Lỗi sao chép",
        message: "Không thể sao chép vào clipboard.",
      });

      // Thử fallback cho copy text thô (nếu API mới thất bại)
      if (type === "raw") {
        try {
          const textArea = document.createElement("textarea");
          textArea.value = messageText;
          textArea.style.position = "fixed";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);

          // Vẫn set feedback nếu fallback thành công
          setCopiedMessage({ id: messageId, type });
          setTimeout(() => setCopiedMessage(null), 2000);
        } catch (fallbackErr) {
          console.error("Fallback copy cũng thất bại:", fallbackErr);
        }
      }
    }
  };

  const handleCopyDebateMessage = (message?: ChatMessage) => {
    if (!message) return;
    const text = formatMessageText(message);
    handleCopyMessage(message.id, text, "raw");
  };

  const modelLabel = useMemo(
    () => (model === "gemini-2.5-pro" ? "Gemini 2.5 Pro" : "Gemini 2.5 Flash"),
    [model]
  );

  const formatMessageText = (message: ChatMessage) => {
    if (message?.content) return message.content;
    if (Array.isArray(message?.parts)) {
      return message.parts
        .map((part: unknown) => {
          if (typeof part === "string") return part;
          const p = part as { text?: unknown } | null;
          if (p && typeof p === "object" && typeof p.text === "string") {
            return p.text as string;
          }
          return "";
        })
        .join("");
    }
    return "";
  };

  // Suggested prompts based on chatbot type
  const getSuggestedPrompts = () => {
    switch (selectedType) {
      case "learning":
        return [
          "Giải thích khái niệm chủ nghĩa Mác - Lênin là gì?",
          "Tóm tắt lịch sử hình thành và phát triển của Đảng Cộng sản Việt Nam",
          "Phân tích các nguyên lý cơ bản của triết học Mác - Lênin",
        ];
      case "debate":
        return [
          "Tranh luận về vai trò của Đảng Cộng sản Việt Nam trong sự nghiệp đổi mới",
          "Phân tích ưu và nhược điểm của chế độ xã hội chủ nghĩa ở Việt Nam",
          "Thảo luận về tầm quan trọng của việc học tập lịch sử Đảng",
        ];
      case "qa":
        return [
          "Lịch thi môn Triết học Mác - Lênin khi nào?",
          "Các tài liệu tham khảo cho môn Lịch sử Đảng Cộng sản Việt Nam?",
          "Thông tin về giảng viên bộ môn Tư tưởng Hồ Chí Minh",
        ];
      default:
        return [
          "Giải thích về chủ nghĩa Mác - Lênin",
          "Lịch sử Đảng Cộng sản Việt Nam",
          "Tư tưởng Hồ Chí Minh",
        ];
    }
  };

  let hasStreamingPlaceholder = false;

  return (
    <ProtectedRouteWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#125093]/10 dark:bg-[#125093]/20 rounded-full filter blur-3xl opacity-50 animate-pulse"></div>
          <div
            className="absolute top-1/2 right-1/4 w-80 h-80 bg-[#00CBB8]/10 dark:bg-[#00CBB8]/20 rounded-full filter blur-3xl opacity-40 animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-[#29B9E7]/10 dark:bg-[#29B9E7]/20 rounded-full filter blur-3xl opacity-30 animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10">
          {/* Hero Section */}
          <section className="pt-24 pb-12 text-center">
            <div className="max-w-7.5xl mx-auto px-3 sm:px-4 lg:px-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#125093] dark:text-[#3b82f6] mb-4 poppins-bold leading-tight">
                CHATBOT AI
              </h1>
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto arimo-regular">
                Cùng chatbot AI giải đáp những thắc mắc về các môn học bộ môn kỹ
                năng mềm tại
                <br className="hidden md:block" />
                <span className="md:hidden"> </span>trường Đại học FPT
              </p>
            </div>
          </section>

          {/* Chatbot Type Selection */}
          <section className="py-8 md:py-12">
            <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {chatbotTypes.map((type) => (
                  <ChatbotTypeCard
                    key={type.id}
                    {...type}
                    isSelected={selectedType === type.id}
                    onClick={() => handleTypeChange(type.id)}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Chat Interface Section */}
          <section ref={chatSectionRef} className="w-full py-4 md:py-6">
            <div className="w-full px-2 md:px-4 lg:px-6">
              {/* Section Title */}
              <div className="text-center mb-6 md:mb-8 px-2 md:px-4">
                <div className="flex items-center justify-center mb-4 md:mb-6">
                  <div
                    className={`w-14 h-14 md:w-16 md:h-16 ${
                      chatbotTypes.find((t) => t.id === selectedType)?.color
                    } rounded-xl flex items-center justify-center text-white shadow-lg mr-3 md:mr-4 transition-all duration-300`}
                  >
                    {(() => {
                      const IconComponent =
                        chatbotTypes.find((t) => t.id === selectedType)?.icon ||
                        Smile;
                      return (
                        <IconComponent className="w-7 h-7 md:w-8 md:h-8" />
                      );
                    })()}
                  </div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#125093] dark:text-[#3b82f6] poppins-bold leading-tight">
                    {chatbotTypes.find((t) => t.id === selectedType)?.name}
                  </h2>
                </div>
              </div>

              {/* Chat Container */}
              <div
                className={`relative rounded-lg shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 ${
                  selectedType === "learning"
                    ? "bg-gradient-to-br from-white via-[#125093]/[0.02] to-white dark:from-gray-800 dark:via-[#125093]/[0.05] dark:to-gray-800"
                    : selectedType === "debate"
                    ? "bg-gradient-to-br from-white via-[#00CBB8]/[0.02] to-white dark:from-gray-800 dark:via-[#00CBB8]/[0.05] dark:to-gray-800"
                    : "bg-gradient-to-br from-white via-[#29B9E7]/[0.02] to-white dark:from-gray-800 dark:via-[#29B9E7]/[0.05] dark:to-gray-800"
                }`}
              >
                {/* Chat Header with Clear Button */}
                <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-8 h-8 ${
                        chatbotTypes.find((t) => t.id === selectedType)?.color
                      } rounded-lg flex items-center justify-center text-white shadow-sm`}
                    >
                      {(() => {
                        const IconComponent =
                          chatbotTypes.find((t) => t.id === selectedType)
                            ?.icon || Smile;
                        return <IconComponent className="w-4 h-4" />;
                      })()}
                    </div>
                    <span className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-200 poppins-semibold">
                      {chatbotTypes.find((t) => t.id === selectedType)?.name}
                    </span>
                  </div>
                  {messages.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearMessages}
                      disabled={isLoading}
                      className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 arimo-regular"
                      title="Xóa lịch sử chat và tạo session mới"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden md:inline">Xóa chat</span>
                    </Button>
                  )}
                </div>
                {isDebateMode && (
                  <DebateControls
                    debateMode={debateMode}
                    debateTurnLimit={debateTurnLimit}
                    debateTopic={debateTopic}
                    debateTopicTouched={debateTopicTouched}
                    debateHasStarted={debateHasStarted}
                    isStartingDebate={isStartingDebate}
                    debateLimitReached={debateLimitReached}
                    debateSummaryRequested={debateSummaryRequested}
                    debateSummaryComplete={debateSummaryComplete}
                    activeDebateTopic={activeDebateTopic}
                    assistantDebateTurns={assistantDebateTurns}
                    onModeChange={handleDebateModeChange}
                    onTurnLimitChange={handleDebateLimitChange}
                    onTopicChange={(value) => {
                      setDebateTopic(value);
                      if (debateTopicTouched && value.trim()) {
                        setDebateTopicTouched(false);
                      }
                    }}
                    onTopicBlur={() => setDebateTopicTouched(true)}
                    onStartDebate={handleStartDebate}
                    onRequestSummary={handleRequestSummary}
                  />
                )}
                {/* Messages */}
                <div
                  ref={chatContainerRef}
                  className="relative h-[calc(100vh-400px)] md:h-[calc(100vh-350px)] min-h-[500px] max-h-[800px] overflow-y-auto p-5 md:p-8 lg:p-10 space-y-5 md:space-y-6 bg-gradient-to-br from-gray-50/50 via-transparent to-white/50 dark:from-gray-900/50 dark:via-transparent dark:to-gray-800/50"
                >
                  {isDebateMode ? (
                    <div className="space-y-6">
                      {debateTurns.length === 0 && !isLoading && (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          Nhập chủ đề tranh luận để bắt đầu phiên debate giữa
                          bạn và AI.
                        </div>
                      )}
                      {showDebateWaitingCard && (
                        <div className="bg-white/80 dark:bg-gray-800/80 border border-dashed border-[#00CBB8]/40 dark:border-[#00CBB8]/50 rounded-2xl p-6 shadow-sm flex items-center gap-3 animate-pulse text-[#00CBB8] dark:text-[#00CBB8]">
                          <Spinner size="sm" inline />
                          <div className="text-sm">
                            Debate AI đang chuẩn bị phản biện cho chủ đề của
                            bạn...
                          </div>
                        </div>
                      )}
                      {debateTurns.map((round, index) => {
                        const userText = round.user
                          ? formatMessageText(round.user)
                          : "";
                        const assistantText = round.assistant
                          ? formatMessageText(round.assistant)
                          : "";
                        const isSummaryRound =
                          debateSummaryComplete &&
                          index === debateTurns.length - 1 &&
                          debateLimitReached;
                        return (
                          <div
                            key={
                              round.user?.id ||
                              round.assistant?.id ||
                              `debate-${index}`
                            }
                            className="bg-white/80 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 md:p-6 shadow-sm animate-in fade-in"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-sm font-semibold text-[#125093] dark:text-[#3b82f6]">
                                Lượt {index + 1}
                              </p>
                              {isSummaryRound && (
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  Tổng kết debate
                                </span>
                              )}
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-[#125093]/5 to-white dark:from-[#125093]/10 dark:to-gray-800 p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Học sinh
                                  </p>
                                  {round.user && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleCopyDebateMessage(round.user)
                                      }
                                      className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 h-auto p-1"
                                      title="Copy lượt này"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                                {round.user ? (
                                  <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                    <MarkdownRenderer content={userText} />
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-400 dark:text-gray-500">
                                    Chờ ý kiến từ học sinh...
                                  </p>
                                )}
                              </div>
                              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs uppercase tracking-wide text-[#00CBB8] dark:text-[#00CBB8]">
                                    Debate AI
                                  </p>
                                  {round.assistant && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleCopyDebateMessage(round.assistant)
                                      }
                                      className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 h-auto p-1"
                                      title="Copy phản biện AI"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                                {round.assistant ? (
                                  <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                    <MarkdownRenderer content={assistantText} />
                                  </div>
                                ) : isLoading ? (
                                  <div className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-[#00CBB8]/40 dark:border-[#00CBB8]/50 bg-[#00CBB8]/5 dark:bg-[#00CBB8]/10 text-sm text-[#00CBB8] dark:text-[#00CBB8] animate-pulse">
                                    <Spinner size="sm" inline />
                                    <span>Debate AI đang phản biện...</span>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-400 dark:text-gray-500">
                                    Chưa có phản hồi
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      {messages.map((message: ChatMessage) => {
                        const messageText = formatMessageText(message);

                        const isErrorMessage =
                          errorMessages.has(message.id) ||
                          (message.role === "assistant" &&
                            messageText.includes("❌") &&
                            messageText.includes("**Lỗi:**"));

                        const isStreaming =
                          message.role === "assistant" &&
                          messageText.trim().length === 0 &&
                          !isErrorMessage;

                        if (isStreaming) {
                          hasStreamingPlaceholder = true;
                        }

                        const isMessageComplete =
                          !isStreaming && !isErrorMessage;

                        return (
                          <div
                            key={message.id}
                            className={`flex flex-col ${
                              message.role === "user"
                                ? "items-end"
                                : "items-start"
                            } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                          >
                            <div className="max-w-[90%] md:max-w-2xl lg:max-w-3xl">
                              <div
                                className={`px-5 py-4 md:px-6 md:py-5 rounded-2xl shadow-sm relative ${
                                  message.role === "user"
                                    ? "bg-gradient-to-br from-[#125093] to-[#0f4278] text-white"
                                    : isErrorMessage
                                    ? "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 border-2 border-red-300 dark:border-red-500/50"
                                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                                } ${
                                  isStreaming && !isErrorMessage
                                    ? "animate-pulse bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800"
                                    : ""
                                }`}
                              >
                                {isStreaming && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-gray-800/50 to-transparent animate-shimmer rounded-2xl" />
                                )}
                                <div className="text-base md:text-lg arimo-regular leading-relaxed relative z-10">
                                  {message.role === "user" ? (
                                    <div className="whitespace-pre-wrap">
                                      {messageText}
                                    </div>
                                  ) : (
                                    <>
                                      {isErrorMessage ? (
                                        <div className="flex items-start space-x-3">
                                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                          <div className="flex-1">
                                            <div className="font-semibold text-red-800 dark:text-red-300 mb-1">
                                              Lỗi xảy ra
                                            </div>
                                            <MarkdownRenderer
                                              content={messageText.replace(
                                                "❌ **Lỗi:** ",
                                                ""
                                              )}
                                            />
                                          </div>
                                        </div>
                                      ) : isStreaming ? (
                                        <div className="flex items-center space-x-3">
                                          <Spinner size="sm" inline />
                                          <span className="text-gray-600 dark:text-gray-400 text-sm arimo-regular">
                                            Đang soạn...
                                          </span>
                                        </div>
                                      ) : (
                                        <div
                                          id={`message-content-${message.id}`}
                                        >
                                          <MarkdownRenderer
                                            content={messageText}
                                          />
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              {message.role === "assistant" &&
                                isMessageComplete &&
                                !isErrorMessage && (
                                  <div className="flex justify-end mt-2">
                                    <div className="flex items-center space-x-2">
                                      {openCopyMenuId === message.id ? (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              handleCopyMessage(
                                                message.id,
                                                messageText,
                                                "raw"
                                              );
                                              setOpenCopyMenuId(null);
                                            }}
                                            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs"
                                            title="Sao chép (văn bản thô)"
                                          >
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Copy Text</span>
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              handleCopyMessage(
                                                message.id,
                                                messageText,
                                                "formatted"
                                              );
                                              setOpenCopyMenuId(null);
                                            }}
                                            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs"
                                            title="Sao chép (có định dạng)"
                                          >
                                            <ClipboardType className="w-3.5 h-3.5" />
                                            <span>Copy Formatted</span>
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              setOpenCopyMenuId(null)
                                            }
                                            className="flex items-center justify-center w-7 h-7 p-0"
                                            title="Đóng"
                                            aria-label="Đóng menu"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </Button>
                                        </>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            setOpenCopyMenuId(message.id)
                                          }
                                          className="flex items-center space-x-1.5 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 h-auto"
                                          title="Sao chép tin nhắn"
                                          aria-label="Sao chép tin nhắn"
                                        >
                                          {copiedMessage?.id === message.id ? (
                                            <>
                                              <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                              <span className="text-green-600 dark:text-green-400">
                                                Đã sao chép
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3.5 h-3.5" />
                                              <span>Copy</span>
                                              <ChevronLeft className="w-3 h-3" />
                                            </>
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })}
                      {isLoading && !hasStreamingPlaceholder && (
                        <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="max-w-[90%] md:max-w-2xl lg:max-w-3xl">
                            <div className="px-5 py-4 md:px-6 md:py-5 rounded-2xl shadow-sm relative bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 animate-pulse bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-gray-800/60 to-transparent animate-shimmer rounded-2xl" />
                              <div className="flex items-center space-x-3 relative z-10">
                                <Spinner size="sm" inline />
                                <span className="text-gray-600 dark:text-gray-400 text-sm arimo-regular">
                                  Đang soạn...
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {messages.length === 0 && !isLoading && (
                        <div className="text-center p-4">
                          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3 poppins-semibold">
                            Gợi ý
                          </h3>
                          <div className="flex flex-wrap justify-center gap-2">
                            {getSuggestedPrompts().map((prompt, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  sendMessage(
                                    {
                                      role: "user",
                                      content: prompt,
                                    },
                                    {
                                      body: { model, type: selectedType },
                                    }
                                  );
                                }}
                                className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 arimo-regular"
                              >
                                {prompt}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="relative z-10 backdrop-blur-md bg-white/70 dark:bg-gray-800/70 md:bg-white/80 dark:md:bg-gray-800/80 border-t border-gray-200/50 dark:border-gray-700/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 p-4 md:p-6">
                  {/* Scroll to Bottom Button - Positioned above input within Chat Interface */}
                  {showScrollToBottom && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (chatContainerRef.current) {
                          chatContainerRef.current.scrollTo({
                            top: chatContainerRef.current.scrollHeight,
                            behavior: "smooth",
                          });
                          setShowScrollToBottom(false);
                          isUserScrollingRef.current = false;
                        }
                      }}
                      className="absolute -top-14 md:-top-16 left-1/2 transform -translate-x-1/2 z-50 rounded-full p-2.5 md:p-3 shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm"
                      aria-label="Cuộn xuống tin nhắn cuối cùng"
                      title="Cuộn xuống tin nhắn cuối cùng"
                    >
                      <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />
                    </Button>
                  )}
                  {isDebateMode && debateMode === "limited" && (
                    <div className="mb-4 text-sm">
                      <p
                        className={`mb-2 ${
                          debateLimitReached ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        Đã dùng{" "}
                        {Math.min(assistantDebateTurns, debateTurnLimit)} /{" "}
                        {debateTurnLimit} lượt phản biện.
                      </p>
                      {debateLimitReached && (
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleRequestSummary}
                            disabled={
                              debateSummaryRequested || debateSummaryComplete
                            }
                            className="inline-flex items-center px-4 py-2 rounded-full bg-[#125093] text-white text-sm font-semibold shadow hover:bg-[#0f4278]"
                          >
                            {debateSummaryRequested ? (
                              <>
                                <Spinner size="sm" inline />
                                <span className="ml-2">Đang tổng kết...</span>
                              </>
                            ) : debateSummaryComplete ? (
                              "Đã tổng kết"
                            ) : (
                              "Tổng kết debate"
                            )}
                          </Button>
                          {debateSummaryComplete ? (
                            <span className="text-green-600 dark:text-green-400 text-sm">
                              AI đã tổng kết. Bấm "Xóa chat" để bắt đầu phiên
                              mới.
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Tổng kết giúp đánh giá luận điểm của cả hai bên.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <form
                    id="chat-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const text = inputMessage.trim();
                      if (!text || isLoading || debateInteractionLocked) return;
                      // Use object format with 'content' - let hook manage message creation
                      sendMessage(
                        {
                          role: "user",
                          content: text,
                        },
                        {
                          body: { model, type: selectedType },
                        }
                      );
                      setInputMessage("");
                    }}
                  >
                    <InputGroup>
                      <InputGroupTextarea
                        placeholder={
                          debateWaitingForTopic
                            ? "Vui lòng nhập chủ đề và bấm “Bắt đầu debate”"
                            : "Ask, Search or Chat..."
                        }
                        value={inputMessage}
                        onChange={(e) => {
                          setInputMessage(e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={
                          isLoading ||
                          debateInteractionLocked ||
                          debateWaitingForTopic
                        }
                        rows={3}
                        className="arimo-regular"
                      />
                      <InputGroupAddon align="block-end">
                        <InputGroupButton
                          variant="outline"
                          className="rounded-full"
                          size="icon-xs"
                          aria-label="Thêm"
                          title="Thêm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </InputGroupButton>
                        <div className="relative">
                          <InputGroupButton
                            asChild
                            variant="ghost"
                            className="rounded-full"
                            size="xs"
                          >
                            <Button
                              ref={modelButtonRef}
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowModelMenu((s) => !s)}
                              aria-haspopup="menu"
                              aria-expanded={showModelMenu}
                            >
                              {modelLabel}
                            </Button>
                          </InputGroupButton>
                          {showModelMenu && (
                            <div
                              ref={modelMenuRef}
                              role="menu"
                              className="absolute left-0 bottom-8 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-20 overflow-hidden [--radius:0.95rem]"
                            >
                              <Button
                                variant="ghost"
                                className={`w-full text-left px-3 py-2 text-sm h-auto justify-start ${
                                  model === "gemini-2.5-pro"
                                    ? "text-[#125093] font-medium"
                                    : "text-gray-700"
                                }`}
                                onClick={() => {
                                  setModel("gemini-2.5-pro");
                                  setShowModelMenu(false);
                                }}
                                role="menuitem"
                              >
                                Gemini 2.5 Pro
                              </Button>
                              <Button
                                variant="ghost"
                                className={`w-full text-left px-3 py-2 text-sm h-auto justify-start ${
                                  model === "gemini-2.5-flash"
                                    ? "text-[#125093] font-medium"
                                    : "text-gray-700"
                                }`}
                                onClick={() => {
                                  setModel("gemini-2.5-flash");
                                  setShowModelMenu(false);
                                }}
                                role="menuitem"
                              >
                                Gemini 2.5 Flash
                              </Button>
                            </div>
                          )}
                        </div>
                        <InputGroupText className="ml-auto text-xs text-gray-500">
                          {inputMessage.trim().length} ký tự
                        </InputGroupText>
                        <div className="!h-4 w-px bg-gray-200 mx-1.5" />
                        {isLoading && (
                          <InputGroupButton
                            type="button"
                            onClick={stop}
                            variant="destructive"
                            className="rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md hover:shadow-lg"
                            size="icon-sm"
                            title="Dừng gửi"
                          >
                            <X className="w-5 h-5" />
                            <span className="sr-only">Dừng gửi</span>
                          </InputGroupButton>
                        )}
                        <InputGroupButton
                          type="submit"
                          variant="default"
                          className="rounded-full bg-[#125093] text-white hover:bg-[#0f4278] transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          size="icon-sm"
                          disabled={
                            !inputMessage.trim() ||
                            isLoading ||
                            debateInteractionLocked
                          }
                          title={
                            isLoading
                              ? "Đang gửi..."
                              : debateInteractionLocked
                              ? "Chế độ debate đang kết thúc"
                              : "Gửi tin nhắn"
                          }
                        >
                          {isLoading ? (
                            <Spinner size="sm" inline />
                          ) : (
                            <ArrowUp className="w-5 h-5" />
                          )}
                          <span className="sr-only">
                            {isLoading ? "Đang gửi..." : "Gửi tin nhắn"}
                          </span>
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </form>
                  <p className="text-[11px] text-gray-500 arimo-regular mt-2 px-1">
                    {debateWaitingForTopic
                      ? "Điền chủ đề và bấm “Bắt đầu debate” để mở phiên tranh luận."
                      : "Nhấn Enter để gửi · Shift + Enter để xuống dòng"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
