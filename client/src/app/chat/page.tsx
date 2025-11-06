"use client";

import { useState } from "react";
import { getAccessToken } from "@/lib/auth";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSend() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setMessages((prev) => prev + `\nYou: ${input}`);
    const token = await getAccessToken();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: input }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      // Read streaming chunks
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => prev + chunk);
      }
    } catch {
      setMessages((p) => p + "\n[error] Không thể gọi API chat");
    } finally {
      setLoading(false);
      setInput("");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Chatbot</h1>
      <div className="space-x-2 flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
          placeholder="Nhập tin nhắn..."
        />
        <button
          onClick={onSend}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Gửi
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded border p-3 bg-gray-50 min-h-[200px]">{messages}</pre>
    </div>
  );
}


