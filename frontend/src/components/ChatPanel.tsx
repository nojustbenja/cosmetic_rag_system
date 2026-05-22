import { useEffect, useRef, useState } from "react";
import { ChatMessage, Product } from "@/types/shop";
import { ArrowUpRight, Cog } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { streamChat } from "@/lib/api";
import { Markdown } from "./Markdown";

type Props = {
  onRecommendations: (products: Product[], guides: any[]) => void;
};

const SUGGESTIONS = [
  "Tengo piel mixta y quiero más luminosidad",
  "Busco un perfume amaderado para la noche",
  "Necesito una rutina antiedad básica",
];

export function ChatPanel({ onRecommendations }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hola. Describe el perfil del cliente y te ayudo a recomendar productos del catalogo cargado.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    let assistantText = "";
    let hasToken = false;
    setMessages((prev) => [...prev, { role: "assistant", content: "Buscando productos relevantes en el catalogo..." }]);

    try {
      await streamChat(text, sessionId, {
        onContext: (context) => {
          const products = context.products ?? [];
          const guides = context.guides ?? [];
          onRecommendations(products, guides);

          if (!hasToken) {
            const count = products.length;
            assistantText = count > 0 
              ? `He encontrado ${count} producto${count > 1 ? 's' : ''} excelente${count > 1 ? 's' : ''} en nuestro catálogo:\n\n`
              : "No encontré productos específicos en nuestro catálogo actual que coincidan directamente, pero permíteme asesorarte con algunas pautas generales:\n\n";
            setMessages((prev) =>
              prev.map((m, idx) => (idx === prev.length - 1 ? { ...m, content: assistantText } : m))
            );
            hasToken = true;
          }
        },
        onToken: (token) => {
          assistantText += token;
          setMessages((prev) =>
            prev.map((m, idx) => (idx === prev.length - 1 ? { ...m, content: assistantText } : m))
          );
        }
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error de conexión con RAG.");
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: "Error inesperado al consultar el RAG." } : m))
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full h-full lg:h-[calc(100vh-3rem)] lg:sticky lg:top-6 self-start flex flex-col glass-panel rounded-[2.5rem] p-6 lg:p-8 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-full bg-foreground text-background flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M12 3 Q12 12 21 12 Q12 12 12 21 Q12 12 3 12 Q12 12 12 3 Z" />
              <path d="M19 3 Q19 6 22 6 Q19 6 19 9 Q19 6 16 6 Q19 6 19 3 Z" className="opacity-70" />
            </svg>
          </div>
          <div>
            <h1 className="text-subtitle">Lumi</h1>
            <p className="text-[12px] font-medium text-muted-foreground">Asesora de belleza · 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-background/60 text-badge text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 align-middle" />
            Activo
          </div>
          <Link
            to="/admin"
            title="Panel de Control (Back Office)"
            className="size-9 rounded-full bg-secondary flex items-center justify-center hover:bg-muted text-foreground transition-all duration-200 hover:scale-105"
          >
            <Cog className="size-4" />
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-6 pb-4 pr-1"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              layout
              className={`max-w-[90%] ${m.role === "user" ? "self-end" : "self-start"}`}
            >
              {m.role === "user" ? (
                <div className="bg-foreground text-background px-5 py-3.5 rounded-3xl rounded-tr-sm text-[14px] leading-relaxed shadow-sm">
                  {m.content}
                </div>
              ) : (
                <div className="text-[14px] leading-relaxed text-foreground/80 font-medium">
                  {m.content ? (
                    <Markdown content={m.content} />
                  ) : loading ? (
                    <TypingDots />
                  ) : null}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3 pt-2 shrink-0">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="px-3.5 py-2 rounded-full glass-input text-label text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="pt-2 shrink-0"
      >
        <div className="relative flex items-center glass-input rounded-full p-2 transition hover:shadow-[0_8px_30px_hsl(220_25%_12%/0.06)] focus-within:ring-2 focus-within:ring-foreground/10">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Cuéntale a Lumi sobre tu piel o qué buscas..."
            aria-label="Mensaje para Lumi"
            className="flex-1 bg-transparent border-none outline-none px-4 text-[14.5px] placeholder:text-muted-foreground/60"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Enviar mensaje"
            className="size-10 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-transform"
          >
            <ArrowUpRight className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1.5 items-center">
      <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0ms" }} />
      <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "200ms" }} />
      <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "400ms" }} />
    </span>
  );
}
