"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    // Simulate form submission
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubmitStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Liên hệ với chúng tôi
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Nếu bạn có thắc mắc hay cần giúp đỡ, vui lòng liên hệ với chúng tôi
            qua các kênh sau
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information Cards */}
          <div className="lg:col-span-1 space-y-6">
            {/* Department Office Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#125093] rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Văn phòng Bộ môn Kỹ năng mềm
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Trường Đại học FPT</p>
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <a
                        href="mailto:vanbinh@fpt.edu.vn"
                        className="hover:text-[#125093] transition-colors"
                      >
                        vanbinh@fpt.edu.vn
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>090.xxx.xxx</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructor 1 Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#1a6bb8] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Thầy Văn Bình
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Giảng viên</p>
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <a
                        href="mailto:vanbinh@fpt.edu.vn"
                        className="hover:text-[#125093] transition-colors"
                      >
                        vanbinh@fpt.edu.vn
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>090.xxx.xxx</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructor 2 Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#1560a3] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Thầy Văn Bình
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Giảng viên</p>
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <a
                        href="mailto:vanbinh@fpt.edu.vn"
                        className="hover:text-[#125093] transition-colors"
                      >
                        vanbinh@fpt.edu.vn
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>090.xxx.xxx</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Gửi tin nhắn cho chúng tôi
              </h2>

              {submitStatus === "success" && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm font-medium">
                    Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất có thể.
                  </p>
                </div>
              )}

              {submitStatus === "error" && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm font-medium">
                    Đã xảy ra lỗi. Vui lòng thử lại sau.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent transition-all"
                      placeholder="Nhập họ và tên"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent transition-all"
                      placeholder="Nhập email"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Chủ đề *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent transition-all"
                    placeholder="Nhập chủ đề"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Tin nhắn *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent transition-all resize-none"
                    placeholder="Nhập tin nhắn của bạn"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#125093] text-white rounded-lg font-semibold hover:bg-[#0d3d6f] transition-colors duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                    <span>{isSubmitting ? "Đang gửi..." : "Gửi tin nhắn"}</span>
                  </button>

                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors duration-300 whitespace-nowrap"
                  >
                    <Home className="w-5 h-5" />
                    <span>Về trang chủ</span>
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

