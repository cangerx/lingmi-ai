"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Send,
  Trash2,
  ChevronDown,
  Bot,
  User,
  Loader2,
  Square,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatAPI } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Conversation {
  id: number;
  title: string;
  model: string;
  message_count: number;
  pinned: boolean;
  updated_at: string;
}

interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  model: string;
  created_at: string;
}

const MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "deepseek-chat", name: "DeepSeek V3", provider: "DeepSeek" },
  { id: "deepseek-reasoner", name: "DeepSeek R1", provider: "DeepSeek" },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google" },
];

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, []);

  const loadConversations = async () => {
    try {
      const res = await chatAPI.listConversations();
      setConversations(res.data);
    } catch {
      // Not logged in or error
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    setSelectedModel(conv.model);
    try {
      const res = await chatAPI.getConversation(conv.id);
      setMessages(res.data.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const createConversation = async () => {
    try {
      const res = await chatAPI.createConversation({ model: selectedModel });
      setConversations([res.data, ...conversations]);
      setActiveConv(res.data);
      setMessages([]);
    } catch {
      // handle error
    }
  };

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatAPI.deleteConversation(id);
      setConversations(conversations.filter((c) => c.id !== id));
      if (activeConv?.id === id) {
        setActiveConv(null);
        setMessages([]);
      }
    } catch {
      // handle error
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const content = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Create conversation if none active
    let conv = activeConv;
    if (!conv) {
      try {
        const res = await chatAPI.createConversation({
          model: selectedModel,
          title: content.slice(0, 30),
        });
        conv = res.data;
        setConversations((prev) => [res.data, ...prev]);
        setActiveConv(res.data);
      } catch {
        return;
      }
    }

    if (!conv) return;

    setSending(true);
    setStreaming(true);
    setStreamContent("");

    // Optimistic add user message
    const tempUserMsg: Message = {
      id: Date.now(),
      role: "user",
      content,
      model: conv.model,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // SSE streaming
    const token = localStorage.getItem("token");
    const controller = new AbortController();
    abortRef.current = controller;
    let fullContent = "";

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
      const res = await fetch(`${apiUrl}/conversations/${conv.id}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Fallback to non-streaming
        const fallback = await chatAPI.sendMessage(conv.id, { content });
        setMessages((prev) => [
          ...prev.slice(0, -1),
          fallback.data.user_message,
          fallback.data.assistant_message,
        ]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              fullContent += delta;
              setStreamContent(fullContent);
            } catch {
              // skip parse errors
            }
          }
        }
      }

      // Add final assistant message
      if (fullContent) {
        const assistantMsg: Message = {
          id: Date.now() + 1,
          role: "assistant",
          content: fullContent,
          model: conv.model,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        // Fallback: try non-stream
        try {
          const fallback = await chatAPI.sendMessage(conv.id, { content });
          setMessages((prev) => [
            ...prev.slice(0, -1),
            fallback.data.user_message,
            fallback.data.assistant_message,
          ]);
        } catch {
          setMessages((prev) => prev.slice(0, -1));
        }
      }
    } finally {
      setSending(false);
      setStreaming(false);
      setStreamContent("");
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <motion.div
        initial={{ x: -15, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="w-[260px] border-r border-neutral-100 bg-white/80 backdrop-blur-sm flex flex-col shrink-0"
      >
        <div className="p-3 border-b border-neutral-200/60">
          <button
            onClick={createConversation}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl border border-neutral-200/60 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Plus size={16} />
            新建对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Bot size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-400">暂无对话</p>
              <p className="text-xs text-neutral-300 mt-1">点击上方按钮开始</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={cn(
                  "group flex items-center justify-between mx-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors",
                  activeConv?.id === conv.id
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{conv.title}</span>
                  <span className="text-xs text-neutral-400">{conv.model}</span>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 transition-all shrink-0"
                >
                  <Trash2 size={14} className="text-neutral-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
        {activeConv ? (
          <>
            {/* Chat header */}
            <motion.div
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between px-6 py-3 border-b border-neutral-100 bg-white/80 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200/60 flex items-center justify-center">
                  <Bot size={16} className="text-neutral-600" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-neutral-900">
                    {activeConv.title}
                  </h2>
                  <span className="text-xs text-neutral-400">
                    {activeConv.model} · {activeConv.message_count} 条消息
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        msg.role === "user"
                          ? "bg-neutral-900"
                          : "bg-neutral-100"
                      )}
                    >
                      {msg.role === "user" ? (
                        <User size={14} className="text-white" />
                      ) : (
                        <Bot size={14} className="text-neutral-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-neutral-400 mb-1.5">
                        {msg.role === "user" ? "你" : msg.model || "AI"}
                      </div>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm prose-neutral max-w-none text-sm leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-sm text-neutral-900 leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Streaming message */}
                {streaming && streamContent && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} className="text-neutral-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-neutral-400 mb-1.5">
                        {currentModel.name}
                      </div>
                      <div className="prose prose-sm prose-neutral max-w-none text-sm leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading indicator */}
                {sending && !streamContent && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} className="text-neutral-600" />
                    </div>
                    <div className="flex items-center gap-2 py-2">
                      <Loader2
                        size={14}
                        className="text-neutral-400 animate-spin"
                      />
                      <span className="text-sm text-neutral-400">思考中...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-neutral-100 bg-white/80 backdrop-blur-sm">
              <div className="max-w-3xl mx-auto px-6 py-4">
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm focus-within:border-neutral-300 focus-within:shadow-md transition-all">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      autoResize();
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="输入消息... Enter 发送，Shift+Enter 换行"
                    rows={1}
                    className="w-full resize-none px-4 pt-3 pb-1 text-sm outline-none bg-transparent"
                  />
                  <div className="flex items-center justify-between px-3 py-2">
                    {/* Model picker */}
                    <div className="relative">
                      <button
                        onClick={() => setShowModelPicker(!showModelPicker)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-neutral-500 hover:bg-neutral-50 transition-colors"
                      >
                        <Bot size={12} />
                        {currentModel.name}
                        <ChevronDown size={12} />
                      </button>

                      {showModelPicker && (
                        <div className="absolute bottom-full left-0 mb-1 w-56 bg-white/95 backdrop-blur-xl border border-neutral-200/60 rounded-xl shadow-lg py-1 z-50">
                          {MODELS.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setSelectedModel(m.id);
                                setShowModelPicker(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-neutral-50 transition-colors",
                                selectedModel === m.id
                                  ? "text-neutral-900 font-medium"
                                  : "text-neutral-600"
                              )}
                            >
                              <span>{m.name}</span>
                              <span className="text-xs text-neutral-400">
                                {m.provider}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Send / Stop */}
                    {streaming ? (
                      <button
                        onClick={stopStreaming}
                        className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <Square size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={sendMessage}
                        disabled={!input.trim() || sending}
                        className="p-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-30 transition-colors shadow-md"
                      >
                        <Send size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty state — new chat with model picker */
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
              className="text-center max-w-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200/60 flex items-center justify-center mx-auto mb-4 shadow-sm"
              >
                <Bot size={26} className="text-neutral-400" />
              </motion.div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-1">
                开始新对话
              </h2>
              <p className="text-sm text-neutral-400 mb-6">
                选择一个模型，输入你的问题
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={cn(
                      "flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all text-sm",
                      selectedModel === m.id
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-neutral-200/60 hover:border-neutral-300"
                    )}
                  >
                    <span className="font-medium text-neutral-900">{m.name}</span>
                    <span className="text-xs text-neutral-400">{m.provider}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm focus-within:border-neutral-300 focus-within:shadow-md transition-all overflow-hidden">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入你的问题..."
                  rows={3}
                  className="w-full resize-none px-4 pt-3 pb-2 text-sm outline-none"
                />
                <div className="flex items-center justify-between px-3 py-2 bg-neutral-50">
                  <span className="text-xs text-neutral-400">
                    {currentModel.name}
                  </span>
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="p-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-30 transition-colors shadow-md"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
