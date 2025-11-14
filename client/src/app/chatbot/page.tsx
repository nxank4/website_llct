"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat, type ChatMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { getSession } from "next-auth/react";
import type { Session } from "next-auth";

import {
  Send,
  MessageSquare,
  GraduationCap,
  Smile,
  Star,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Loader2,
  AlertCircle,
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

export default function ChatbotPage() {
  const getInitialMessage = (type: string) => {
    switch (type) {
      case "learning":
        return "Xin chào! Tôi là Chatbot Học Tập. Tôi có thể giúp bạn hiểu các khái niệm, giải thích bài học và hướng dẫn làm bài tập. Bạn cần hỗ trợ gì?";
      case "debate":
        return "Xin chào! Tôi là Chatbot Debate. Tôi có thể giúp bạn tranh luận, phân tích quan điểm và thảo luận về các chủ đề học tập. Hãy cùng thảo luận!";
      case "qa":
        return "Xin chào! Tôi là Chatbot Q&A. Tôi có thể trả lời các câu hỏi về thông tin khóa học, lịch thi và hướng dẫn sử dụng hệ thống. Bạn muốn biết gì?";
      default:
        return "Xin chào! Tôi là AI Chatbot của Soft Skills Department. Tôi có thể giúp bạn gì hôm nay?";
    }
  };

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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();
  const [errorMessages, setErrorMessages] = useState<Set<string>>(new Set());
  const [cachedMessageIds, setCachedMessageIds] = useState<Set<string>>(
    new Set()
  );
  const requestStartTimeRef = useRef<number | null>(null);
  const lastUserMessageTimeRef = useRef<number | null>(null);

  // Gọi trực tiếp AI Server
  const apiUrl = `${
    process.env.NEXT_PUBLIC_AI_SERVER_URL ?? "http://localhost:8001"
  }/api/v1/chat/stream`;

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

          // Validate token format: JWT tokens start with "eyJ" (base64 encoded JSON)
          const isJWTToken = (token: string | null | undefined): boolean => {
            if (!token) return false;
            // JWT tokens have 3 parts separated by dots: header.payload.signature
            const parts = token.split(".");
            return parts.length === 3 && token.startsWith("eyJ");
          };

          // Fallback: Try localStorage (for backward compatibility)
          // But prioritize Supabase RS256 token from session
          const localStorageToken =
            typeof window !== "undefined"
              ? localStorage.getItem("access_token")
              : null;

          // Use Supabase RS256 token if available, otherwise fallback to localStorage
          const token = supabaseToken || localStorageToken;

          if (!token) {
            console.warn(
              "No token found in session or localStorage. Please login again."
            );
            return undefined;
          }

          // Validate token format
          if (!isJWTToken(token)) {
            console.error(
              "Token is not a valid JWT token! Token format:",
              token.substring(0, 50) + "...",
              "This might be a user ID (UUID) instead of a JWT token."
            );
            console.error(
              "Please login again to get a valid RS256 JWT token from Supabase."
            );
            return undefined;
          }

          if (supabaseToken) {
            console.debug(
              "Using Supabase RS256 token from NextAuth session:",
              token.substring(0, 20) + "..."
            );
          } else {
            console.warn(
              "Using localStorage token (may be HS256). Please login again to get RS256 token."
            );
          }

          return { Authorization: `Bearer ${token}` };
        }) as unknown as Record<string, string>,
        credentials: "include",
      }),
    [apiUrl]
  );

  const { messages, sendMessage, isLoading, setMessages, stop } = useChat({
    transport,
    body: { model, type: selectedType },
  });

  // Track when loading finishes to reset cache detection
  const prevIsLoadingRef = useRef(isLoading);
  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading) {
      // Loading just finished, reset request start time after a delay
      setTimeout(() => {
        requestStartTimeRef.current = null;
      }, 1000);
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading]);

  // Track when user sends a message to detect cache responses
  useEffect(() => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === "user");

    if (lastUserMessage) {
      const messageTime = Date.now();
      // If this is a new user message, track the time
      if (
        !lastUserMessageTimeRef.current ||
        messageTime - lastUserMessageTimeRef.current > 1000
      ) {
        lastUserMessageTimeRef.current = messageTime;
        requestStartTimeRef.current = messageTime;
      }
    }
  }, [messages]);

  // Detect cache responses (messages that appear very quickly after user message)
  useEffect(() => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === "assistant");

    if (lastAssistantMessage && requestStartTimeRef.current) {
      const responseTime = Date.now() - requestStartTimeRef.current;
      const messageText = formatMessageText(lastAssistantMessage);

      // If response comes in less than 500ms AND has substantial content immediately,
      // it's likely from cache (cache responses come instantly with full content)
      if (
        responseTime < 500 &&
        messageText.trim().length > 20 &&
        !cachedMessageIds.has(lastAssistantMessage.id)
      ) {
        setCachedMessageIds((prev) =>
          new Set(prev).add(lastAssistantMessage.id)
        );

        // After 800ms, remove from cache loading to show the message
        setTimeout(() => {
          setCachedMessageIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(lastAssistantMessage.id);
            return newSet;
          });
        }, 800);
      }
    }
  }, [messages, cachedMessageIds]);

  // Monitor for errors in messages (check for error patterns)
  useEffect(() => {
    // Check the last assistant message for error indicators
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === "assistant");

    if (lastAssistantMessage) {
      const messageText = formatMessageText(lastAssistantMessage);
      const isError =
        messageText.includes("❌") ||
        messageText.toLowerCase().includes("error") ||
        messageText.toLowerCase().includes("lỗi") ||
        messageText.toLowerCase().includes("failed") ||
        messageText.toLowerCase().includes("thất bại");

      if (isError && !errorMessages.has(lastAssistantMessage.id)) {
        // Show toast notification for error
        showToast({
          type: "error",
          title: "Lỗi Chatbot",
          message: "Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại.",
          duration: 6000,
        });

        // Track error message
        setErrorMessages((prev) => new Set(prev).add(lastAssistantMessage.id));
      }
    }
  }, [messages, errorMessages, showToast]);

  // Ensure there's always an assistant message box when loading
  // This creates an empty assistant message if needed so loading can show inside it
  useEffect(() => {
    if (isLoading) {
      const lastUserMessage = [...messages]
        .reverse()
        .find((msg) => msg.role === "user");

      if (lastUserMessage) {
        const lastAssistantMessage = [...messages]
          .reverse()
          .find((msg) => msg.role === "assistant");

        // If no assistant message exists after user message, create an empty one for loading
        // Check if there's already a loading placeholder to avoid duplicates
        const hasLoadingPlaceholder = messages.some((msg) =>
          msg.id?.startsWith("loading-")
        );

        if (!lastAssistantMessage && !hasLoadingPlaceholder) {
          const loadingMessage: ChatMessage = {
            id: `loading-${Date.now()}`,
            role: "assistant",
            content: "",
          };
          setMessages([...messages, loadingMessage]);
        }
      }
    }
  }, [isLoading, messages, setMessages]);

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

  // Auto scroll to bottom when new messages arrive (only within chat container)
  useEffect(() => {
    if (chatContainerRef.current && !isUserScrollingRef.current) {
      const container = chatContainerRef.current;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;

      // Only auto-scroll if user is near bottom (within 100px)
      if (isNearBottom) {
        // Use requestAnimationFrame for smooth scrolling during streaming
        // Double RAF ensures DOM has updated before scrolling
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (chatContainerRef.current && !isUserScrollingRef.current) {
              // Use scrollTop instead of scrollTo to avoid smooth scroll interruption
              chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
            }
          });
        });
      }
    }
  }, [messages, isLoading]);

  // Track user scroll behavior
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Mark that user is scrolling
      isUserScrollingRef.current = true;

      // Check if user scrolled to bottom
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        50;

      // If user scrolled to bottom, allow auto-scroll again after a delay
      if (isAtBottom) {
        scrollTimeoutRef.current = setTimeout(() => {
          isUserScrollingRef.current = false;
        }, 1000);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

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

  // Initialize with welcome message only once on mount
  // Only set if messages array is empty (first load)
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: `init-${selectedType}-${Date.now()}`,
          role: "assistant",
          content: getInitialMessage(selectedType),
        } as ChatMessage,
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Track welcome message to preserve it
  const welcomeMessageRef = useRef<ChatMessage | null>(null);

  // Update welcome message ref when messages change
  useEffect(() => {
    const welcomeMsg = messages.find(
      (msg) => msg.role === "assistant" && msg.id?.startsWith("init-")
    );
    if (welcomeMsg) {
      welcomeMessageRef.current = welcomeMsg;
    }
  }, [messages]);

  // Protect welcome message - restore it if it gets removed during chat
  useEffect(() => {
    const hasWelcome = messages.some(
      (msg) => msg.role === "assistant" && msg.id?.startsWith("init-")
    );
    const hasUserMessage = messages.some((msg) => msg.role === "user");

    // If user has sent messages but welcome message is missing, restore it
    if (hasUserMessage && !hasWelcome && welcomeMessageRef.current) {
      const hasOtherAssistant = messages.some(
        (msg) => msg.role === "assistant" && !msg.id?.startsWith("init-")
      );

      // Only restore if there's no other assistant message (to avoid duplicates)
      if (!hasOtherAssistant) {
        const firstUserIndex = messages.findIndex((msg) => msg.role === "user");
        if (firstUserIndex !== -1) {
          const newMessages = [...messages];
          newMessages.splice(firstUserIndex, 0, welcomeMessageRef.current);
          setMessages(newMessages);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

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
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: "assistant",
        content: getInitialMessage(type),
      } as ChatMessage,
    ]);
    // Auto scroll to chat section
    setTimeout(scrollToChat, 100);
    setInputMessage("");
    stop?.();
  };

  const handleClearMessages = () => {
    // Stop any ongoing request
    stop?.();
    // Clear all messages and reset to initial message
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: "assistant",
        content: getInitialMessage(selectedType),
      } as ChatMessage,
    ]);
    // Clear error messages tracking
    setErrorMessages(new Set());
    // Clear cached message IDs
    setCachedMessageIds(new Set());
    // Reset request tracking
    requestStartTimeRef.current = null;
    lastUserMessageTimeRef.current = null;
    // Clear input
    setInputMessage("");
  };

  const handleCopyMessage = async (messageText: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedMessageId(messageId);
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
      // Fallback: Use execCommand for older browsers
      try {
        const textArea = document.createElement("textarea");
        textArea.value = messageText;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopiedMessageId(messageId);
        setTimeout(() => {
          setCopiedMessageId(null);
        }, 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
      }
    }
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

  return (
    <ProtectedRouteWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#125093]/10 rounded-full filter blur-3xl opacity-50 animate-pulse"></div>
          <div
            className="absolute top-1/2 right-1/4 w-80 h-80 bg-[#00CBB8]/10 rounded-full filter blur-3xl opacity-40 animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-[#29B9E7]/10 rounded-full filter blur-3xl opacity-30 animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10">
          {/* Hero Section */}
          <section className="pt-24 pb-12 text-center">
            <div className="max-w-7.5xl mx-auto px-3 sm:px-4 lg:px-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#125093] mb-4 poppins-bold leading-tight">
                CHATBOT AI
              </h1>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto arimo-regular">
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
                {chatbotTypes.map((type) => {
                  const IconComponent = type.icon;
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleTypeChange(type.id)}
                      aria-pressed={isSelected}
                      className={`group relative w-full p-6 md:p-8 bg-white rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ring-1 ${
                        isSelected
                          ? "border-[#125093]/60 ring-[#125093]/20 scale-[1.02]"
                          : "border-gray-200 ring-gray-100 hover:border-[#125093]/40"
                      }`}
                    >
                      {/* subtle accent background */}
                      <div
                        className={`pointer-events-none absolute -inset-2 bg-gradient-to-br ${type.gradient} opacity-10 blur-2xl rounded-[1.25rem]`}
                        aria-hidden="true"
                      />
                      {/* Icon */}
                      <div className="flex justify-center mb-4 md:mb-6">
                        <div
                          className={`w-14 h-14 md:w-16 md:h-16 ${
                            type.color
                          } rounded-xl flex items-center justify-center text-white shadow-lg transition-transform duration-300 ${
                            isSelected ? "scale-110" : "group-hover:scale-105"
                          }`}
                        >
                          <IconComponent className="w-7 h-7 md:w-8 md:h-8" />
                        </div>
                      </div>

                      {/* Content */}
                      <h3
                        className={`text-xl md:text-2xl font-bold mb-3 text-center poppins-bold transition-colors ${
                          isSelected ? "text-[#125093]" : "text-gray-900"
                        }`}
                      >
                        {type.name}
                      </h3>
                      <p className="text-sm md:text-base text-gray-600 text-center leading-relaxed arimo-regular">
                        {type.description}
                      </p>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-3 h-3 bg-[#125093] rounded-full animate-pulse"></div>
                      )}
                    </button>
                  );
                })}
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
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#125093] poppins-bold leading-tight">
                    {chatbotTypes.find((t) => t.id === selectedType)?.name}
                  </h2>
                </div>
              </div>

              {/* Chat Container */}
              <div
                className={`rounded-lg shadow-xl overflow-hidden border border-gray-100 ${
                  selectedType === "learning"
                    ? "bg-gradient-to-br from-white via-[#125093]/[0.02] to-white"
                    : selectedType === "debate"
                    ? "bg-gradient-to-br from-white via-[#00CBB8]/[0.02] to-white"
                    : "bg-gradient-to-br from-white via-[#29B9E7]/[0.02] to-white"
                }`}
              >
                {/* Chat Header with Clear Button */}
                <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white/50 border-b border-gray-100">
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
                    <span className="text-sm md:text-base font-medium text-gray-700 poppins-semibold">
                      {chatbotTypes.find((t) => t.id === selectedType)?.name}
                    </span>
                  </div>
                  {messages.length > 1 && (
                    <button
                      onClick={handleClearMessages}
                      disabled={isLoading}
                      className="flex items-center space-x-2 px-3 py-1.5 md:px-4 md:py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed arimo-regular"
                      title="Xóa lịch sử chat và tạo session mới"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden md:inline">Xóa chat</span>
                    </button>
                  )}
                </div>
                {/* Messages */}
                <div
                  ref={chatContainerRef}
                  className="h-[calc(100vh-400px)] md:h-[calc(100vh-350px)] min-h-[500px] max-h-[800px] overflow-y-auto p-5 md:p-8 lg:p-10 space-y-5 md:space-y-6 bg-gradient-to-br from-gray-50/50 via-transparent to-white/50"
                >
                  {messages.map((message: ChatMessage, index: number) => {
                    const messageText = formatMessageText(message);
                    // Check if this is the last assistant message and still streaming
                    const isLastAssistantMessage =
                      message.role === "assistant" &&
                      index ===
                        messages.map((m) => m.role).lastIndexOf("assistant");
                    // Check if this is a cached message that should show loading animation
                    const isCachedMessage = cachedMessageIds.has(message.id);

                    // Show streaming animation if:
                    // 1. Currently loading AND (message is empty/short OR it's a loading placeholder)
                    // 2. OR it's a cached message (show loading animation even if content exists)
                    // 3. This is the last assistant message
                    const isLoadingPlaceholder =
                      message.id?.startsWith("loading-");
                    const isStreaming =
                      isLastAssistantMessage &&
                      ((isLoading &&
                        (messageText.trim().length < 10 ||
                          isLoadingPlaceholder)) ||
                        isCachedMessage);
                    const isMessageComplete = !isStreaming;

                    // Always show message box, even if empty - we'll show loading inside

                    // Check if this is an error message
                    const isErrorMessage =
                      errorMessages.has(message.id) ||
                      (message.role === "assistant" &&
                        messageText.includes("❌") &&
                        messageText.includes("**Lỗi:**"));

                    // No need to hide empty messages - we'll show loading in the message box

                    return (
                      <div
                        key={message.id}
                        className={`flex flex-col ${
                          message.role === "user" ? "items-end" : "items-start"
                        } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      >
                        <div className="max-w-[90%] md:max-w-2xl lg:max-w-3xl">
                          <div
                            className={`px-5 py-4 md:px-6 md:py-5 rounded-2xl shadow-sm relative ${
                              message.role === "user"
                                ? "bg-gradient-to-br from-[#125093] to-[#0f4278] text-white"
                                : isErrorMessage
                                ? "bg-red-50 text-red-900 border-2 border-red-300"
                                : "bg-white text-gray-900 border border-gray-200"
                            } ${
                              isStreaming && !isErrorMessage
                                ? "animate-pulse bg-gradient-to-r from-gray-50 via-white to-gray-50"
                                : ""
                            }`}
                          >
                            {/* Skeleton animation overlay when streaming */}
                            {isStreaming && (
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer rounded-2xl" />
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
                                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <div className="font-semibold text-red-800 mb-1">
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
                                      <Loader2 className="w-5 h-5 text-[#125093] animate-spin" />
                                      <span className="text-gray-600 text-sm arimo-regular">
                                        Đang soạn...
                                      </span>
                                    </div>
                                  ) : (
                                    <MarkdownRenderer content={messageText} />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {/* Copy button - only for assistant messages when message is complete (not error messages) */}
                          {message.role === "assistant" &&
                            isMessageComplete &&
                            !isErrorMessage && (
                              <div className="flex justify-end mt-2">
                                <button
                                  onClick={() =>
                                    handleCopyMessage(messageText, message.id)
                                  }
                                  className="flex items-center space-x-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#125093] focus:ring-offset-2"
                                  title="Sao chép tin nhắn"
                                  aria-label="Sao chép tin nhắn"
                                >
                                  {copiedMessageId === message.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-green-600" />
                                      <span className="text-green-600">
                                        Đã sao chép
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Sao chép</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Suggested Prompts */}
                  {messages.length <= 1 && !isLoading && (
                    <div className="text-center p-4">
                      <h3 className="text-lg font-medium text-gray-700 mb-3 poppins-semibold">
                        Gợi ý
                      </h3>
                      <div className="flex flex-wrap justify-center gap-2">
                        {getSuggestedPrompts().map((prompt, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              sendMessage(
                                {
                                  id: `u-${Date.now()}`,
                                  role: "user",
                                  parts: [{ type: "text", text: prompt }],
                                } as unknown as {
                                  id: string;
                                  role: "user";
                                  parts: Array<
                                    { type?: string; text?: string } | string
                                  >;
                                },
                                {
                                  body: { model, type: selectedType },
                                } as unknown as {
                                  body?: Record<string, unknown>;
                                }
                              );
                            }}
                            className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors arimo-regular"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* No separate loading indicator - loading is always shown inside message boxes */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="bg-white/90 transition p-4 md:p-6 border-t border-gray-100">
                  <form
                    id="chat-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const text = inputMessage.trim();
                      if (!text || isLoading) return;
                      sendMessage(
                        {
                          id: `u-${Date.now()}`,
                          role: "user",
                          parts: [{ type: "text", text }],
                        } as unknown as {
                          id: string;
                          role: "user";
                          parts: Array<
                            { type?: string; text?: string } | string
                          >;
                        },
                        {
                          body: { model, type: selectedType },
                        } as unknown as {
                          body?: Record<string, unknown>;
                        }
                      );
                      setInputMessage("");
                    }}
                  >
                    <InputGroup>
                      <InputGroupTextarea
                        placeholder="Ask, Search or Chat..."
                        value={inputMessage}
                        onChange={(e) => {
                          setInputMessage(e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
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
                            <button
                              ref={modelButtonRef}
                              type="button"
                              onClick={() => setShowModelMenu((s) => !s)}
                              aria-haspopup="menu"
                              aria-expanded={showModelMenu}
                            >
                              {modelLabel}
                            </button>
                          </InputGroupButton>
                          {showModelMenu && (
                            <div
                              ref={modelMenuRef}
                              role="menu"
                              className="absolute left-0 bottom-8 w-44 rounded-xl border border-gray-200 bg-white shadow-lg z-20 overflow-hidden [--radius:0.95rem]"
                            >
                              <button
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
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
                              </button>
                              <button
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
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
                              </button>
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
                          disabled={!inputMessage.trim() || isLoading}
                          title={isLoading ? "Đang gửi..." : "Gửi tin nhắn"}
                        >
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                          <span className="sr-only">
                            {isLoading ? "Đang gửi..." : "Gửi tin nhắn"}
                          </span>
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </form>
                  <p className="text-[11px] text-gray-500 arimo-regular mt-2 px-1">
                    Nhấn Enter để gửi · Shift + Enter để xuống dòng
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
