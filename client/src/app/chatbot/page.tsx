'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Send, Bot, User, MessageSquare, GraduationCap, Smile, Star, Mail, Phone, ChevronDown } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ChatbotPage() {
  const getInitialMessage = (type: string) => {
    switch (type) {
      case 'learning':
        return 'Xin chào! Tôi là Chatbot Học Tập. Tôi có thể giúp bạn hiểu các khái niệm, giải thích bài học và hướng dẫn làm bài tập. Bạn cần hỗ trợ gì?';
      case 'debate':
        return 'Xin chào! Tôi là Chatbot Debate. Tôi có thể giúp bạn tranh luận, phân tích quan điểm và thảo luận về các chủ đề học tập. Hãy cùng thảo luận!';
      case 'qa':
        return 'Xin chào! Tôi là Chatbot Q&A. Tôi có thể trả lời các câu hỏi về thông tin khóa học, lịch thi và hướng dẫn sử dụng hệ thống. Bạn muốn biết gì?';
      default:
        return 'Xin chào! Tôi là AI Chatbot của Soft Skills Department. Tôi có thể giúp bạn gì hôm nay?';
    }
  };

  const [selectedType, setSelectedType] = useState('learning');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: getInitialMessage('learning'),
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatSectionRef = useRef<HTMLDivElement>(null);

  const chatbotTypes = [
    {
      id: 'learning',
      name: 'CHATBOT HỌC TẬP',
      icon: GraduationCap,
      color: 'bg-[#5B72EE]',
      description: 'Our curriculum focuses on nurturing cognitive, social, emotional, and physical development, ensuring a well-rounded education.'
    },
    {
      id: 'debate',
      name: 'CHATBOT DEBATE',
      icon: MessageSquare,
      color: 'bg-[#00CBB8]',
      description: 'Our passionate and qualified teachers create a supportive and stimulating learning environment.'
    },
    {
      id: 'qa',
      name: 'CHATBOT Q&A',
      icon: Star,
      color: 'bg-[#29B9E7]',
      description: 'We prioritize safety and provide a warm and caring atmosphere for every child.'
    }
  ];

  // Auto scroll to chat section when type changes
  const scrollToChat = () => {
    if (chatSectionRef.current) {
      chatSectionRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };


  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Try to call Gemini API
      const response = await fetch('http://127.0.0.1:8000/api/v1/chat/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          type: selectedType
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: data.response || `Cảm ơn bạn đã hỏi về "${currentMessage}". Đây là câu trả lời từ ${chatbotTypes.find(t => t.id === selectedType)?.name}.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        throw new Error('API call failed');
      }
    } catch (error) {
      console.log('Gemini API not available, using intelligent fallback response');
      
      // Intelligent fallback responses based on message content
      let response = '';
      const message = currentMessage.toLowerCase();
      
      if (selectedType === 'learning') {
        if (message.includes('kỹ năng mềm') || message.includes('soft skills')) {
          response = 'Kỹ năng mềm là những khả năng cá nhân giúp bạn tương tác hiệu quả với người khác. Bao gồm: giao tiếp, làm việc nhóm, lãnh đạo, giải quyết vấn đề, tư duy phản biện, và quản lý thời gian.';
        } else if (message.includes('giao tiếp')) {
          response = 'Giao tiếp hiệu quả bao gồm: lắng nghe tích cực, diễn đạt rõ ràng, sử dụng ngôn ngữ cơ thể phù hợp, và thấu hiểu người nghe. Hãy thực hành thường xuyên để cải thiện.';
        } else if (message.includes('làm việc nhóm')) {
          response = 'Làm việc nhóm hiệu quả cần: phân chia vai trò rõ ràng, giao tiếp cởi mở, tôn trọng ý kiến khác, và cùng hướng tới mục tiêu chung.';
        } else {
          response = `Đây là câu hỏi thú vị về "${currentMessage}". Trong bộ môn Kỹ năng mềm, chúng ta học cách phát triển các kỹ năng cá nhân và xã hội. Bạn có thể tìm hiểu thêm trong thư viện tài liệu.`;
        }
      } else if (selectedType === 'debate') {
        if (message.includes('tầm quan trọng') || message.includes('quan trọng')) {
          response = 'Kỹ năng mềm rất quan trọng vì: 1) Giúp xây dựng mối quan hệ tốt, 2) Tăng hiệu quả công việc, 3) Phát triển sự nghiệp, 4) Cải thiện chất lượng cuộc sống. Tuy nhiên, cần cân bằng với kỹ năng cứng.';
        } else if (message.includes('ưu nhược điểm') || message.includes('pros and cons')) {
          response = 'Ưu điểm: Tăng hiệu quả làm việc, cải thiện mối quan hệ, phát triển sự nghiệp. Nhược điểm: Cần thời gian rèn luyện, khó đo lường, phụ thuộc vào môi trường.';
        } else {
          response = `Hãy cùng tranh luận về "${currentMessage}". Tôi nghĩ đây là chủ đề thú vị để thảo luận. Bạn có quan điểm nào về vấn đề này không?`;
        }
      } else if (selectedType === 'qa') {
        if (message.includes('lịch thi') || message.includes('schedule')) {
          response = 'Lịch thi sẽ được thông báo trên hệ thống LMS và email. Vui lòng kiểm tra thường xuyên để không bỏ lỡ thông tin quan trọng.';
        } else if (message.includes('lms') || message.includes('hệ thống')) {
          response = 'Hệ thống LMS giúp bạn: xem tài liệu, làm bài tập, kiểm tra điểm số, và tương tác với giảng viên. Đăng nhập bằng tài khoản sinh viên để sử dụng.';
        } else {
          response = `Cảm ơn bạn đã hỏi về "${currentMessage}". Đây là thông tin từ hệ thống Q&A. Nếu cần hỗ trợ thêm, vui lòng liên hệ phòng đào tạo.`;
        }
      } else {
        response = `Cảm ơn bạn đã hỏi về "${currentMessage}". Đây là câu trả lời từ ${chatbotTypes.find(t => t.id === selectedType)?.name}. Tôi đang học hỏi để có thể hỗ trợ bạn tốt hơn!`;
      }
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setMessages([{
      id: 1,
      type: 'bot',
      content: getInitialMessage(type),
      timestamp: new Date()
    }]);
    // Auto scroll to chat section
    setTimeout(scrollToChat, 100);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white relative overflow-hidden">
        {/* Background with gradient effects */}
        <div className="absolute inset-0 bg-[#125093]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-white"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-[#89BCFF] rounded-full filter blur-3xl opacity-30 transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-[#868EFF] rounded-full filter blur-3xl opacity-30"></div>
        
        {/* Small decorative dots */}
        <div className="absolute top-1/3 left-1/4 w-5 h-5 bg-[#8C7AFF] rounded-full"></div>
        <div className="absolute top-1/4 right-1/3 w-5 h-5 bg-[#00CBB8] rounded-full"></div>
        <div className="absolute top-1/2 left-1/3 w-6 h-6 bg-[#29B9E7] rounded-full"></div>

        {/* Floating cards */}
        <div className="absolute top-1/4 left-1/6 w-20 h-20 bg-white rounded-2xl shadow-lg transform -rotate-12"></div>
        <div className="absolute top-1/4 right-1/6 w-20 h-20 bg-white rounded-2xl shadow-lg transform rotate-12"></div>

        {/* Main Content */}
        <div className="relative z-10">
          {/* Hero Section */}
          <section className="pt-32 pb-16 text-center">
            <div className="max-w-4xl mx-auto px-4">
              <h1 className="text-[54px] font-bold text-[#00CBB8] mb-6 leading-[81px]">CHATBOT AI</h1>
              <p className="text-[24px] text-white leading-[38.40px]">
                Cùng chatbot AI giải đáp những thắc mắc về các môn học bộ môn kỹ năng mềm tại<br/>
                trường Đại học FPT
              </p>
            </div>
          </section>

          {/* Chatbot Type Selection */}
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {chatbotTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <div key={type.id} className="relative">
                      {/* Icon */}
                      <div className="flex justify-center mb-6">
                        <div className={`w-16 h-16 ${type.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                          <IconComponent className="w-8 h-8" />
                        </div>
                      </div>
                      
                      {/* Card */}
                      <button
                        onClick={() => handleTypeChange(type.id)}
                        className={`w-full p-12 bg-white rounded-xl shadow-lg border-2 transition-all duration-300 ${
                          selectedType === type.id
                            ? 'border-[#010514] scale-105'
                            : 'border-transparent hover:shadow-xl hover:scale-105'
                        }`}
                      >
                        <h3 className="text-[28px] font-bold text-[#010514] mb-4 text-left leading-[36.40px]">{type.name}</h3>
                        <p className="text-[20px] text-[#5B5B5B] text-left leading-[30px]">{type.description}</p>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Chat Interface Section */}
          <section ref={chatSectionRef} className="py-16">
            <div className="max-w-6xl mx-auto px-4">
              {/* Section Title */}
              <div className="text-center mb-12">
                <div className="flex items-center justify-center mb-6">
                  <div className={`w-16 h-16 ${chatbotTypes.find(t => t.id === selectedType)?.color} rounded-xl flex items-center justify-center text-white shadow-lg mr-4`}>
                    {(() => {
                      const IconComponent = chatbotTypes.find(t => t.id === selectedType)?.icon || Smile;
                      return <IconComponent className="w-8 h-8" />;
                    })()}
                  </div>
                  <h2 className="text-[54px] font-bold text-[#010514] leading-[81px]">
                    {chatbotTypes.find(t => t.id === selectedType)?.name}
                  </h2>
                </div>
              </div>

              {/* Chat Container */}
              <div className="bg-white rounded-2xl overflow-hidden">
                {/* Messages */}
                <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-blue-50 to-white">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-line">
                          {message.content.split('\n').map((line, index) => {
                            // Handle bullet points
                            if (line.trim().startsWith('- ')) {
                              return (
                                <div key={index} className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>{line.substring(2)}</span>
                                </div>
                              );
                            }
                            // Handle numbered lists
                            if (line.trim().match(/^\d+\.\s/)) {
                              return (
                                <div key={index} className="flex items-start">
                                  <span className="mr-2 font-semibold">{line.match(/^\d+\./)?.[0]}</span>
                                  <span>{line.replace(/^\d+\.\s/, '')}</span>
                                </div>
                              );
                            }
                            // Handle bold text
                            if (line.includes('**')) {
                              const parts = line.split(/(\*\*.*?\*\*)/g);
                              return (
                                <div key={index}>
                                  {parts.map((part, partIndex) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                      return (
                                        <strong key={partIndex} className="font-semibold">
                                          {part.slice(2, -2)}
                                        </strong>
                                      );
                                    }
                                    return part;
                                  })}
                                </div>
                              );
                            }
                            // Regular text
                            return <div key={index}>{line}</div>;
                          })}
                        </div>
                        <p className={`text-xs mt-1 ${
                          message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="animate-pulse">Đang suy nghĩ...</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>


                {/* Input */}
                <div className="p-6 bg-white">
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Tôi có thể hỗ trợ gì cho bạn"
                      className="flex-1 px-6 py-4 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-[24px] leading-[38.40px] text-[#010514]"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                      className="w-14 h-14 bg-white rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      <Send className="w-6 h-6 text-[#010514]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}