"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  ChevronDown,
  Square,
  RefreshCw,
  MessageSquare,
  Copy,
  Check,
  Sparkles,
  Download,
  Loader2,
  ImageIcon,
  PanelLeftClose,
  PanelLeft,
  Search,
  ThumbsUp,
  ThumbsDown,
  ArrowUp,
  Paperclip,
  Pencil,
  Mail,
  Palette,
  Globe,
  Code,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatAPI, modelAPI, imageAPI, generationAPI } from "@/lib/api";
import { downloadImage } from "@/lib/download";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";

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

interface ImageGenTask {
  prompt: string;
  status: "pending" | "generating" | "completed" | "failed";
  url?: string;
  genId?: number;
  error?: string;
}

function extractImageGenPrompts(text: string): string[] {
  const regex = /<image_gen>([\s\S]*?)<\/image_gen>/g;
  const prompts: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    prompts.push(match[1].trim());
  }
  return prompts;
}

function stripImageGenTags(text: string): string {
  return text.replace(/<image_gen>[\s\S]*?<\/image_gen>/g, '').trim();
}

const FALLBACK_MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "deepseek-chat", name: "DeepSeek V3", provider: "DeepSeek" },
  { id: "deepseek-reasoner", name: "DeepSeek R1", provider: "DeepSeek" },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google" },
];

const SUGGESTIONS = [
  { label: "帮我写一封邮件", icon: Mail },
  { label: "生成一张图片", icon: Palette },
  { label: "翻译这段文字", icon: Globe },
  { label: "写一段代码", icon: Code },
];

function groupConversationsByDate(convs: Conversation[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups: { label: string; items: Conversation[] }[] = [];
  const todayItems: Conversation[] = [];
  const yesterdayItems: Conversation[] = [];
  const weekItems: Conversation[] = [];
  const olderItems: Conversation[] = [];

  for (const c of convs) {
    const d = new Date(c.updated_at);
    if (d >= today) todayItems.push(c);
    else if (d >= yesterday) yesterdayItems.push(c);
    else if (d >= sevenDaysAgo) weekItems.push(c);
    else olderItems.push(c);
  }

  if (todayItems.length) groups.push({ label: "今天", items: todayItems });
  if (yesterdayItems.length) groups.push({ label: "昨天", items: yesterdayItems });
  if (weekItems.length) groups.push({ label: "近7天", items: weekItems });
  if (olderItems.length) groups.push({ label: "更早", items: olderItems });
  return groups;
}

function ActionBar({ content, onRegenerate }: { content: string; onRegenerate?: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-0.5 mt-2 opacity-0 group-hover/msg:opacity-100 transition-opacity"
    >
      <button onClick={copy} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors" title="复制">
        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
      </button>
      {onRegenerate && (
        <button onClick={onRegenerate} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors" title="重新生成">
          <RefreshCw size={14} />
        </button>
      )}
      <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors" title="有用">
        <ThumbsUp size={14} />
      </button>
      <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors" title="无用">
        <ThumbsDown size={14} />
      </button>
    </motion.div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  usePageTitle("AI 对话");
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(searchParams.get("q") || "");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [MODELS, setModels] = useState(FALLBACK_MODELS);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoSentRef = useRef(false);
  const [imageGenTasks, setImageGenTasks] = useState<Record<number, ImageGenTask[]>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [imageModels, setImageModels] = useState<{ name: string; display_name: string; provider: string }[]>([]);
  const [pendingImageGen, setPendingImageGen] = useState<{ msgId: number; content: string } | null>(null);

  useEffect(() => {
    loadConversations();
    modelAPI.list("chat").then((res) => {
      const models = res.data.data;
      if (models && models.length > 0) {
        setModels(models.map((m: any) => ({
          id: m.name,
          name: m.display_name || m.name,
          provider: m.description || m.type,
        })));
        setSelectedModel(models[0].name);
      }
    }).catch(() => {});
    modelAPI.imageModels().then((res) => {
      const imgs = res.data?.data;
      if (imgs && imgs.length > 0) {
        setImageModels(imgs.map((m: any) => ({ name: m.name, display_name: m.display_name || m.name, provider: m.provider || '' })));
      }
    }).catch(() => {});
  }, []);

  // Auto-send if ?q= query param is present
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      setInput(q);
      // Delay to let models load first
      setTimeout(() => {
        setInput(q);
      }, 300);
    }
  }, [searchParams]);

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

  const requestImageGeneration = useCallback((msgId: number, content: string) => {
    const prompts = extractImageGenPrompts(content);
    if (prompts.length === 0) return;
    if (imageModels.length > 1) {
      setPendingImageGen({ msgId, content });
    } else {
      triggerImageGeneration(msgId, content, imageModels[0]?.name);
    }
  }, [imageModels]);

  const triggerImageGeneration = useCallback(async (msgId: number, content: string, imageModel?: string) => {
    const prompts = extractImageGenPrompts(content);
    if (prompts.length === 0) return;
    setPendingImageGen(null);

    // Initialize tasks
    const tasks: ImageGenTask[] = prompts.map((p) => ({ prompt: p, status: "generating" }));
    setImageGenTasks((prev) => ({ ...prev, [msgId]: tasks }));

    // Generate each image
    for (let i = 0; i < prompts.length; i++) {
      try {
        const res = await imageAPI.generate({ prompt: prompts[i], n: 1, model: imageModel });
        const gen = res.data?.data;
        if (gen?.id) {
          // Update task with genId
          setImageGenTasks((prev) => {
            const updated = [...(prev[msgId] || [])];
            updated[i] = { ...updated[i], genId: gen.id, status: "generating" };
            return { ...prev, [msgId]: updated };
          });
          // Poll for completion
          const pollInterval = setInterval(async () => {
            try {
              const pollRes = await generationAPI.get(gen.id);
              const pollGen = pollRes.data?.data;
              if (pollGen?.status === "completed" && pollGen?.result_url) {
                clearInterval(pollInterval);
                setImageGenTasks((prev) => {
                  const updated = [...(prev[msgId] || [])];
                  updated[i] = { ...updated[i], status: "completed", url: pollGen.result_url };
                  return { ...prev, [msgId]: updated };
                });
              } else if (pollGen?.status === "failed") {
                clearInterval(pollInterval);
                console.error('[ImageGen] Generation failed:', pollGen);
                setImageGenTasks((prev) => {
                  const updated = [...(prev[msgId] || [])];
                  updated[i] = { ...updated[i], status: "failed", error: pollGen?.error_msg || '生成失败' };
                  return { ...prev, [msgId]: updated };
                });
              }
            } catch (pollErr) { console.error('[ImageGen] Poll error:', pollErr); }
          }, 3000);
        } else if (gen?.result_url) {
          // Immediate result
          setImageGenTasks((prev) => {
            const updated = [...(prev[msgId] || [])];
            updated[i] = { ...updated[i], status: "completed", url: gen.result_url };
            return { ...prev, [msgId]: updated };
          });
        }
      } catch (genErr: any) {
        console.error('[ImageGen] Generate API error:', genErr?.response?.data || genErr);
        setImageGenTasks((prev) => {
          const updated = [...(prev[msgId] || [])];
          updated[i] = { ...updated[i], status: "failed", error: genErr?.response?.data?.error || '请求失败' };
          return { ...prev, [msgId]: updated };
        });
      }
    }
  }, []);

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
        const msgId = Date.now() + 1;
        const assistantMsg: Message = {
          id: msgId,
          role: "assistant",
          content: fullContent,
          model: conv.model,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Check for image generation tags and trigger generation
        const imagePrompts = extractImageGenPrompts(fullContent);
        if (imagePrompts.length > 0) {
          requestImageGeneration(msgId, fullContent);
        }
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

  const regenerateLastMessage = async () => {
    if (!activeConv || messages.length < 2 || sending) return;
    // Find the last user message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const lastUserMsg = messages[messages.length - 1 - lastUserIdx];
    // Remove the last assistant message
    setMessages((prev) => prev.slice(0, prev.length - 1 - lastUserIdx + 1));
    // Re-send
    setInput(lastUserMsg.content);
    setTimeout(() => sendMessage(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];
  const filteredConvs = searchQuery
    ? conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;
  const convGroups = groupConversationsByDate(filteredConvs);

  return (
    <div className="flex h-full">
      {/* ── Sidebar ── */}
      <AnimatePresence initial={false}>
      {sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
          className="hidden sm:flex flex-col shrink-0 border-r border-neutral-200/40 bg-neutral-50/80 overflow-hidden"
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={createConversation}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-neutral-700 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-neutral-200/60"
            >
              <Plus size={16} className="text-neutral-500" />
              新对话
            </motion.button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-neutral-200/60 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-neutral-200/60 focus-within:border-neutral-300 transition-colors">
              <Search size={14} className="text-neutral-400 shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索对话..."
                className="flex-1 text-xs outline-none bg-transparent placeholder:text-neutral-400"
              />
            </div>
          </div>

          {/* Conversation list by date group */}
          <div className="flex-1 overflow-y-auto px-1.5">
            {convGroups.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MessageSquare size={24} className="mx-auto text-neutral-200 mb-2" />
                <p className="text-xs text-neutral-400">{searchQuery ? "无搜索结果" : "暂无对话"}</p>
              </div>
            ) : (
              convGroups.map((group) => (
                <div key={group.label} className="mb-1">
                  <div className="px-3 py-1.5 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                    {group.label}
                  </div>
                  {group.items.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={cn(
                        "group flex items-center gap-2 mx-1 px-2.5 py-2 rounded-lg cursor-pointer text-[13px] transition-all",
                        activeConv?.id === conv.id
                          ? "bg-white text-neutral-900 shadow-sm border border-neutral-200/60"
                          : "text-neutral-600 hover:bg-white/60"
                      )}
                    >
                      <MessageSquare size={14} className={cn("shrink-0", activeConv?.id === conv.id ? "text-neutral-600" : "text-neutral-300")} />
                      <span className="flex-1 truncate">{conv.title}</span>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-all shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </motion.aside>
      )}
      </AnimatePresence>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {activeConv ? (
          <>
            {/* Header bar */}
            <div className="flex items-center gap-3 px-4 pr-28 py-2.5 border-b border-neutral-100">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <PanelLeft size={18} />
                </button>
              )}
              {!sidebarOpen && (
                <button
                  onClick={createConversation}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                  title="新对话"
                >
                  <Pencil size={18} />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-medium text-neutral-800 truncate">
                  {activeConv.title}
                </h2>
              </div>
              {/* Model badge */}
              <div className="relative">
                <button
                  onClick={() => setShowModelPicker(!showModelPicker)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-200 text-xs text-neutral-500 hover:bg-neutral-50 transition-colors"
                >
                  {currentModel.name}
                  <ChevronDown size={12} />
                </button>
                <AnimatePresence>
                {showModelPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-full right-0 mt-1 w-56 bg-white border border-neutral-200/60 rounded-xl shadow-lg py-1 z-50"
                  >
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-[13px] hover:bg-neutral-50 transition-colors",
                          selectedModel === m.id ? "text-neutral-900 font-medium" : "text-neutral-600"
                        )}
                      >
                        <span>{m.name}</span>
                        <span className="text-[11px] text-neutral-400">{m.provider}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-6 space-y-6">
                <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="group/msg"
                  >
                    {msg.role === "user" ? (
                      /* ── User message ── */
                      <div className="flex justify-end">
                        <div className="max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap bg-neutral-100 text-neutral-900 rounded-2xl rounded-br-md px-4 py-2.5">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      /* ── Assistant message ── */
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles size={13} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="prose prose-sm prose-neutral max-w-none text-[14px] leading-relaxed [&>*:first-child]:mt-0">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {stripImageGenTags(msg.content)}
                            </ReactMarkdown>
                          </div>
                          {/* Inline generated images */}
                          {imageGenTasks[msg.id] && imageGenTasks[msg.id].length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2 max-w-md">
                              {imageGenTasks[msg.id].map((task, ti) => (
                                <motion.div
                                  key={ti}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: ti * 0.1, duration: 0.3 }}
                                  className="group/img relative rounded-xl overflow-hidden border border-neutral-200/60 bg-neutral-50"
                                >
                                  {task.status === "completed" && task.url ? (
                                    <>
                                      <img src={task.url} alt={task.prompt} className="w-full aspect-square object-cover" />
                                      <button
                                        onClick={() => downloadImage(task.url!, `chat-img-${ti + 1}.png`)}
                                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                                      >
                                        <Download size={14} />
                                      </button>
                                    </>
                                  ) : task.status === "failed" ? (
                                    <div className="aspect-square flex items-center justify-center">
                                      <div className="text-center px-2">
                                        <ImageIcon size={20} className="mx-auto text-red-300 mb-1" />
                                        <p className="text-xs text-red-400 mb-1">{task.error || "生成失败"}</p>
                                        <button
                                          onClick={() => requestImageGeneration(msg.id, msg.content)}
                                          className="text-[11px] text-neutral-500 hover:text-neutral-700 underline"
                                        >
                                          重试
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="aspect-square flex items-center justify-center">
                                      <div className="text-center">
                                        <Loader2 size={20} className="mx-auto text-neutral-300 animate-spin mb-1.5" />
                                        <p className="text-[11px] text-neutral-400">生成中...</p>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          )}
                          {/* Action bar */}
                          <ActionBar
                            content={stripImageGenTags(msg.content)}
                            onRegenerate={idx === messages.length - 1 ? regenerateLastMessage : undefined}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                </AnimatePresence>

                {/* Streaming */}
                <AnimatePresence>
                {streaming && streamContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={13} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="prose prose-sm prose-neutral max-w-none text-[14px] leading-relaxed [&>*:first-child]:mt-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {stripImageGenTags(streamContent)}
                        </ReactMarkdown>
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="inline-block w-[2px] h-4 bg-neutral-800 ml-0.5 align-middle rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>

                {/* Thinking dots */}
                <AnimatePresence>
                {sending && !streamContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
                      <Sparkles size={13} className="text-white" />
                    </div>
                    <div className="flex items-center gap-1.5 py-3">
                      <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0 }} className="w-2 h-2 rounded-full bg-neutral-300" />
                      <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }} className="w-2 h-2 rounded-full bg-neutral-300" />
                      <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }} className="w-2 h-2 rounded-full bg-neutral-300" />
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* ── Input area ── */}
            <div className="px-4 sm:px-6 pb-4 pt-2">
              <div className="max-w-[760px] mx-auto">
                <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm focus-within:border-neutral-300 focus-within:shadow-md transition-all">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => { setInput(e.target.value); autoResize(); }}
                    onKeyDown={handleKeyDown}
                    placeholder="给 AI 发送消息"
                    rows={1}
                    className="w-full resize-none px-4 pt-3.5 pb-2 text-sm outline-none bg-transparent placeholder:text-neutral-400"
                  />
                  <div className="flex items-center justify-between px-3 pb-2.5">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors" title="附件">
                        <Paperclip size={16} />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowModelPicker(!showModelPicker)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 transition-colors"
                        >
                          {currentModel.name}
                          <ChevronDown size={12} />
                        </button>
                        <AnimatePresence>
                        {showModelPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute bottom-full left-0 mb-1 w-56 bg-white border border-neutral-200/60 rounded-xl shadow-lg py-1 z-50"
                          >
                            {MODELS.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2 text-[13px] hover:bg-neutral-50 transition-colors",
                                  selectedModel === m.id ? "text-neutral-900 font-medium" : "text-neutral-600"
                                )}
                              >
                                <span>{m.name}</span>
                                <span className="text-[11px] text-neutral-400">{m.provider}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <AnimatePresence mode="wait">
                    {streaming ? (
                      <motion.button
                        key="stop"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.8 }}
                        onClick={stopStreaming}
                        className="p-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 transition-colors"
                      >
                        <Square size={16} />
                      </motion.button>
                    ) : (
                      <motion.button
                        key="send"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.8 }}
                        onClick={sendMessage}
                        disabled={!input.trim() || sending}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          input.trim()
                            ? "bg-neutral-900 text-white hover:bg-neutral-700"
                            : "bg-neutral-100 text-neutral-300"
                        )}
                      >
                        <ArrowUp size={16} />
                      </motion.button>
                    )}
                    </AnimatePresence>
                  </div>
                </div>
                <p className="text-center text-[11px] text-neutral-400 mt-2">
                  AI 可能会犯错，请核实重要信息。
                </p>
              </div>
            </div>
          </>
        ) : (
          /* ── Empty state ── */
          <div className="flex-1 flex flex-col">
            {/* Top bar when sidebar collapsed */}
            {!sidebarOpen && (
              <div className="flex items-center gap-2 px-4 py-2.5">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <PanelLeft size={18} />
                </button>
                <button
                  onClick={createConversation}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                  title="新对话"
                >
                  <Pencil size={18} />
                </button>
              </div>
            )}
            <div className="flex-1 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
                className="w-full max-w-[640px] px-6"
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
                    className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mx-auto mb-4"
                  >
                    <Sparkles size={20} className="text-white" />
                  </motion.div>
                  <h1 className="text-2xl font-semibold text-neutral-900 mb-1">有什么可以帮你的？</h1>
                  <p className="text-sm text-neutral-400">选择模型，输入问题开始对话</p>
                </div>

                {/* Suggestion chips */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      onClick={() => { setInput(s.label); textareaRef.current?.focus(); }}
                      className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-neutral-200/60 text-left text-sm text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-all"
                    >
                      <s.icon size={16} className="text-neutral-400 shrink-0" />
                      <span>{s.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Input */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm focus-within:border-neutral-300 focus-within:shadow-md transition-all">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="给 AI 发送消息"
                      rows={3}
                      className="w-full resize-none px-4 pt-3.5 pb-2 text-sm outline-none bg-transparent placeholder:text-neutral-400"
                    />
                    <div className="flex items-center justify-between px-3 pb-2.5">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors" title="附件">
                          <Paperclip size={16} />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setShowModelPicker(!showModelPicker)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 transition-colors"
                          >
                            {currentModel.name}
                            <ChevronDown size={12} />
                          </button>
                          <AnimatePresence>
                          {showModelPicker && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.97 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="absolute bottom-full left-0 mb-1 w-56 bg-white border border-neutral-200/60 rounded-xl shadow-lg py-1 z-50"
                            >
                              {MODELS.map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 text-[13px] hover:bg-neutral-50 transition-colors",
                                    selectedModel === m.id ? "text-neutral-900 font-medium" : "text-neutral-600"
                                  )}
                                >
                                  <span>{m.name}</span>
                                  <span className="text-[11px] text-neutral-400">{m.provider}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <motion.button
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          input.trim()
                            ? "bg-neutral-900 text-white hover:bg-neutral-700"
                            : "bg-neutral-100 text-neutral-300"
                        )}
                      >
                        <ArrowUp size={16} />
                      </motion.button>
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-neutral-400 mt-2">
                    AI 可能会犯错，请核实重要信息。
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* ── Image model picker modal ── */}
      <AnimatePresence>
      {pendingImageGen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setPendingImageGen(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-neutral-200/60 w-full max-w-sm mx-4 overflow-hidden"
          >
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-base font-semibold text-neutral-900">选择图片模型</h3>
              <p className="text-xs text-neutral-400 mt-1">不同模型价格和效果不同</p>
            </div>
            <div className="px-3 pb-3 space-y-1">
              {imageModels.map((m) => (
                <button
                  key={m.name}
                  onClick={() => triggerImageGeneration(pendingImageGen.msgId, pendingImageGen.content, m.name)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <ImageIcon size={16} className="text-neutral-500" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-neutral-800">{m.display_name}</span>
                      {m.provider && <span className="block text-[11px] text-neutral-400">{m.provider}</span>}
                    </div>
                  </div>
                  <ArrowUp size={14} className="text-neutral-300" />
                </button>
              ))}
            </div>
            <div className="px-5 pb-4">
              <button
                onClick={() => setPendingImageGen(null)}
                className="w-full py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                取消
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
