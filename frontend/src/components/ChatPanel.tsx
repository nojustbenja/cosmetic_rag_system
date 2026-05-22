import { useEffect, useRef, useState, useCallback } from "react";
import { ChatMessage, Product } from "@/types/shop";
import { ArrowUpRight, Cog, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { streamChat, fetchProductReason } from "@/lib/api";
import { Markdown } from "./Markdown";
import { LumiStatus } from "./LumiStatus";

type Props = {
  onRecommendations: (products: Product[], guides: any[]) => void;
  onClearChat: () => void;
};

const SUGGESTIONS = [
  "Tengo piel mixta y quiero más luminosidad",
  "Busco un perfume amaderado para la noche",
  "Necesito una rutina antiedad básica",
];

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hola. Describe el perfil del cliente y te ayudo a recomendar productos del catalogo cargado.",
};

export function ChatPanel({ onRecommendations, onClearChat }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  /** Reset everything — new session, empty history, clear parent catalog state */
  const handleClear = useCallback(() => {
    setMessages([{ ...INITIAL_MESSAGE, id: crypto.randomUUID() }]);
    setSessionId(crypto.randomUUID());
    setInput("");
    onClearChat();
    toast.success("Nueva conversación iniciada.");
  }, [onClearChat]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setInput("");
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    let assistantText = "";
    let productCount = 0;
    let hasToken = false;
    const assistantMessageId = crypto.randomUUID();
    let streamedProducts: Product[] = [];

    // Show a lightweight "thinking" placeholder immediately
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      },
    ]);

    try {
      await streamChat(text, sessionId, {
        onProduct: (product) => {
          streamedProducts = [...streamedProducts, product];
          productCount = streamedProducts.length;
          onRecommendations(streamedProducts, []);

          // Keep chat message minimal — the cards are the visual focus
          const summary =
            productCount === 1
              ? `Encontré **1 producto** relevante. Explora la tarjeta →`
              : `Encontré **${productCount} productos** relevantes. Explora las tarjetas →`;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: summary, products: streamedProducts } : m
            )
          );
        },
        onContextDone: ({ guides, total }) => {
          onRecommendations(streamedProducts, guides);
          if (!hasToken && total === 0) {
            assistantText =
              "No encontré productos específicos en el catálogo actual. Permíteme asesorarte con algunas pautas generales:\n\n";
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId ? { ...m, content: assistantText } : m
              )
            );
            hasToken = true;
          }
        },
        onToken: (token) => {
          // If products were already found, append LLM commentary below the summary
          if (productCount > 0 && !hasToken) {
            assistantText =
              productCount === 1
                ? `Encontré **1 producto** relevante. Explora la tarjeta →\n\n`
                : `Encontré **${productCount} productos** relevantes. Explora las tarjetas →\n\n`;
            hasToken = true;
          }
          assistantText += token;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: assistantText } : m
            )
          );
        },
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error de conexión con RAG.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: "Error inesperado al consultar el RAG." }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100dvh-3rem)] flex flex-col glass-panel rounded-[2.5rem] p-6 lg:p-8 overflow-hidden">
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
            <p className="text-[12px] font-medium text-muted-foreground">Asesora de belleza</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LumiStatus />

          {/* Nueva consulta — resets chat + catalog */}
          {messages.length > 1 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleClear}
              disabled={loading}
              title="Nueva conversación"
              aria-label="Limpiar chat e iniciar nueva conversación"
              className="size-9 rounded-full bg-secondary flex items-center justify-center hover:bg-muted text-foreground transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="size-4" />
            </motion.button>
          )}

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
          {messages.map((m) => (
            <motion.div
              key={m.id}
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
                <div className="bg-secondary/75 border border-border/60 px-5 py-3.5 rounded-3xl rounded-tl-sm text-[14px] leading-relaxed text-foreground/85 font-medium">
                  {m.content ? (
                    <>
                      <Markdown content={m.content} />
                      {m.products && m.products.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2">
                          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Productos recomendados:</p>
                          <ProductMentionGroup products={m.products} />
                        </div>
                      )}
                    </>
                  ) : loading ? (
                    <TypingDots />
                  ) : null}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Suggestions — only on fresh start */}
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
    <div className="flex items-center gap-2.5">
      <span className="text-[13px] text-muted-foreground font-medium italic">Lumi está pensando</span>
      <span className="inline-flex gap-1.5 items-center">
        <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0ms" }} />
        <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "200ms" }} />
        <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "400ms" }} />
      </span>
    </div>
  );
}

function ProductMentionGroup({ products }: { products: Product[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {products.map((p, idx) => (
        <ProductMention 
          key={p.id} 
          product={p} 
          index={idx + 1} 
          isOpen={openId === p.id}
          onToggle={() => setOpenId(openId === p.id ? null : p.id)}
        />
      ))}
    </div>
  );
}

function ProductMention({ product, index, isOpen, onToggle }: { product: Product; index: number; isOpen: boolean; onToggle: () => void }) {
  const [localReason, setLocalReason] = useState(product.reason || "");
  const [loadingReason, setLoadingReason] = useState(false);

  useEffect(() => {
    if (isOpen && !localReason && product.query) {
      setLoadingReason(true);
      fetchProductReason(product.query, product)
        .then(reason => setLocalReason(reason))
        .catch(err => {
          console.error(err);
          setLocalReason("No se pudo obtener la recomendación.");
        })
        .finally(() => setLoadingReason(false));
    }
  }, [isOpen, localReason, product]);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-2 rounded-xl bg-background/50 hover:bg-background/80 border border-border/40 transition-colors text-left"
      >
        <div className="shrink-0 size-8 rounded-lg bg-white overflow-hidden flex items-center justify-center shadow-sm">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="size-full object-contain" />
          ) : (
            <span className="text-[10px] text-muted-foreground font-bold">{index}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-bold text-foreground truncate">{product.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{product.brand}</p>
        </div>
      </button>

      {/* Popover/Dialog for Reason */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute bottom-full mb-2 left-0 w-64 md:w-80 z-50 bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="size-6 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold">
                {index}
              </div>
              <p className="text-[13px] font-bold text-foreground leading-tight">{product.name}</p>
            </div>
            {loadingReason ? (
              <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground py-2">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Lumi está analizando...</span>
              </div>
            ) : (
              <p className="text-[12.5px] text-muted-foreground leading-relaxed text-justify">
                <strong className="text-foreground">¿Por qué lo recomiendo?</strong><br/>
                {localReason || "Este producto es relevante según tu consulta y preferencias."}
              </p>
            )}
            
            <button 
              onClick={onToggle}
              className="mt-3 w-full py-1.5 rounded-lg bg-secondary text-[12px] font-medium hover:bg-muted transition-colors text-foreground"
            >
              Cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
