import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, RotateCcw, Sparkles, ChevronDown, Loader2, AlertCircle, Plus, ImageIcon } from "lucide-react";

type Role = "user" | "assistant";
interface ChatMessage {
  role: Role;
  content: string;
  imageUrl?: string; // base64 data URL for user-attached images
}

const SUGGESTED = [
  "How do I grade a coin?",
  "What makes Ottoman coins valuable?",
  "How to spot a fake coin?",
  "Best ways to store silver coins",
];

function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="bg-black/20 rounded px-1 font-mono text-xs">{part.slice(1, -1)}</code>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MessageBubble({ msg, isStreaming }: { msg: ChatMessage; isStreaming?: boolean }) {
  const isUser = msg.role === "user";
  const lines = msg.content.split("\n");

  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0 mb-1">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
      <div className={`max-w-[82%] flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        {/* Image attachment */}
        {isUser && msg.imageUrl && (
          <div className="rounded-2xl rounded-br-sm overflow-hidden border border-primary/30 shadow-md max-w-[200px]">
            <img src={msg.imageUrl} alt="Attached coin" className="w-full object-cover" />
          </div>
        )}
        {/* Text bubble — only render if there's text */}
        {msg.content && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card border border-border/60 text-foreground rounded-bl-sm"
            }`}
          >
            {lines.map((line, i) => {
              const isBullet = line.match(/^[-•*]\s/);
              const isNumbered = line.match(/^\d+\.\s/);
              const isHeading = line.match(/^#{1,3}\s/);
              const trimmed = isBullet ? line.slice(2) : isNumbered ? line.replace(/^\d+\.\s/, "") : isHeading ? line.replace(/^#{1,3}\s/, "") : line;

              if (isHeading) {
                return <p key={i} className="font-semibold text-primary mt-1.5 mb-0.5"><MarkdownText text={trimmed} /></p>;
              }
              if (isBullet || isNumbered) {
                return (
                  <div key={i} className="flex gap-2 mt-0.5">
                    <span className={`flex-shrink-0 mt-1 ${isUser ? "text-primary-foreground/70" : "text-primary"}`}>
                      {isNumbered ? "›" : "•"}
                    </span>
                    <span><MarkdownText text={trimmed} /></span>
                  </div>
                );
              }
              if (line === "") return <div key={i} className="h-1.5" />;
              return <p key={i}><MarkdownText text={line} /></p>;
            })}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-current opacity-70 animate-pulse ml-0.5 rounded-sm" />
            )}
          </div>
        )}
        {/* Image-only message with streaming */}
        {isUser && msg.imageUrl && !msg.content && isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-primary opacity-70 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}

export function CoinChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const [pendingImage, setPendingImage] = useState<string | null>(null); // base64 preview
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) { setError("Image must be under 8 MB."); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setPendingImage(dataUrl);
      inputRef.current?.focus();
    };
    reader.readAsDataURL(file);
  }, []);

  const sendMessage = async (text: string, imageUrl?: string) => {
    const userText = text.trim();
    if (!userText && !imageUrl) return;
    if (isLoading) return;

    setError("");
    setInput("");
    setPendingImage(null);

    const userMsg: ChatMessage = { role: "user", content: userText, imageUrl };
    const newHistory: ChatMessage[] = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: newHistory }),
      });

      if (!res.ok) throw new Error("Request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.content) {
              assistantContent += evt.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
            if (evt.done) {
              if (!open) setUnread(u => u + 1);
            }
          } catch {}
        }
      }
    } catch {
      setError("Numis is temporarily unavailable. Please try again.");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input, pendingImage || undefined);
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
    setInput("");
    setPendingImage(null);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        data-testid="button-chatbot-toggle"
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center group ${
          open
            ? "bg-muted border border-border text-muted-foreground hover:text-foreground"
            : "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5"
        }`}
        aria-label={open ? "Close chatbot" : "Open AI coin expert"}
      >
        {open ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <>
            <Bot className="w-6 h-6" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-40 md:bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm transition-all duration-300 origin-bottom-right ${
          open ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-card border border-border/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden" style={{ height: "520px" }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/60 flex items-center justify-center gold-border-glow">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-sm text-foreground">Numis</span>
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="w-2.5 h-2.5" /> AI Expert
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Royal Museum Coin Specialist</p>
            </div>
            <button
              onClick={clearChat}
              disabled={messages.length === 0 && !pendingImage}
              title="Clear chat"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.length === 0 && !pendingImage && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4 gold-border-glow">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <p className="font-serif text-base font-bold text-foreground mb-1">Ask Numis</p>
                <p className="text-xs text-muted-foreground mb-5">
                  Your AI companion for all things numismatic — grading, history, valuation, authentication, and more.
                  <br />
                  <span className="text-primary/70 font-medium mt-1 inline-flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> You can also attach a coin photo for analysis.
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-2 w-full">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      data-testid={`button-suggestion-${q.slice(0, 10).replace(/\s/g, "-")}`}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs px-3 py-2.5 rounded-xl bg-muted/60 border border-border/50 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all leading-snug"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                isStreaming={isLoading && i === messages.length - 1 && msg.role === "assistant"}
              />
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-card border border-border/60 rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Image preview strip (pending attachment) */}
          {pendingImage && (
            <div className="px-3 pt-2 flex-shrink-0">
              <div className="relative inline-block">
                <img
                  src={pendingImage}
                  alt="Pending attachment"
                  className="h-16 w-16 object-cover rounded-xl border border-primary/40 shadow"
                />
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border shadow flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-border/40 flex-shrink-0 bg-card/50">
            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="input-chatbot-image"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
                e.target.value = "";
              }}
            />

            {/* Attach button */}
            <button
              type="button"
              data-testid="button-chatbot-attach"
              onClick={() => fileRef.current?.click()}
              disabled={isLoading}
              title="Attach a coin photo"
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-40 ${
                pendingImage
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>

            <input
              ref={inputRef}
              data-testid="input-chatbot-message"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={pendingImage ? "Ask about this coin..." : "Ask about coins, grading, history..."}
              disabled={isLoading}
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors placeholder:text-muted-foreground/60 disabled:opacity-50"
            />
            <button
              data-testid="button-chatbot-send"
              type="submit"
              disabled={(!input.trim() && !pendingImage) || isLoading}
              className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
