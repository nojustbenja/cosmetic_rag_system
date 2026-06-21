import { useEffect, useRef, useCallback, useState } from "react";
import { ChatMessage, Product } from "@/types/shop";
import { motion, AnimatePresence } from "framer-motion";
import { Markdown } from "../Markdown";
import { fetchProductReason } from "@/lib/api";
import { FALLBACK_IMAGE_URL, getProductImage } from "@/lib/images";
import { CircleNotch, Sparkle, ArrowCounterClockwise, BookOpen, ThumbsUp, ThumbsDown } from "@phosphor-icons/react";

type ChatMessageListProps = {
  messages: ChatMessage[];
  loading: boolean;
  statusLabel: string;
  onSendChip: (text: string, meta: { source: string }) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onUpdateProductReason: (productId: string, reason: string) => void;
  onFeedback: (messageId: string, feedback: "up" | "down") => void;
};

export function ChatMessageList({
  messages,
  loading,
  statusLabel,
  onSendChip,
  setMessages,
  onUpdateProductReason,
  onFeedback,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const performScroll = () => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: loading ? "auto" : "smooth",
      });
    };

    const frameId = requestAnimationFrame(performScroll);
    return () => cancelAnimationFrame(frameId);
  }, [messages, loading]);

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-6 pb-4 pr-1 ${messages.length <= 1 ? "justify-center" : ""}`}
    >
      <AnimatePresence mode="popLayout">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            layout
            className={`max-w-[88%] ${m.role === "user" ? "self-end" : "self-start"}`}
          >
            {m.role === "user" ? (
              <div className="bg-foreground text-background px-5 py-3.5 rounded-[1.5rem] rounded-tr-none text-[14px] leading-relaxed shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-foreground/5 font-medium selection:bg-background/25 selection:text-background">
                {m.content}
              </div>
            ) : (
              <div className="glass-card border border-white/20 px-6 py-4 rounded-[1.75rem] rounded-tl-none text-[14.5px] leading-relaxed text-foreground shadow-sm flex flex-col gap-3 font-medium selection:bg-foreground/10 selection:text-foreground">
                {m.content ? (
                  <>
                    <Markdown content={m.content} />
                    {m.products && m.products.length > 0 && (
                      <div className="mt-4 flex flex-col gap-2 border-t border-foreground/5 pt-3">
                        <p className="text-eyebrow text-muted-foreground/80 mb-1">Productos recomendados por Lumi:</p>
                        <ProductMentionGroup products={m.products} onUpdateProductReason={onUpdateProductReason} />
                      </div>
                    )}
                    {m.guides && m.guides.length > 0 && (
                      <div className="mt-4 flex flex-col gap-2 border-t border-foreground/5 pt-3">
                        <p className="text-eyebrow text-muted-foreground/80 mb-1">Fuentes consultadas por Lumi:</p>
                        <div className="flex flex-col gap-2">
                          {m.guides.map((guide, idx) => (
                            <div key={idx} className="flex flex-col gap-1.5 p-2.5 rounded-[1.25rem] bg-background/50 border border-foreground/10">
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
                                <BookOpen className="size-3.5" />
                                <span className="text-[12px] font-bold truncate">{guide.filename} {guide.page && `(Pág. ${guide.page})`}</span>
                              </div>
                              <span className="text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2 italic">"{guide.snippet?.replace(/\[Documento: .*?\] - /, '') || ''}"</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {m.chips && m.chips.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.chips.map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              onSendChip(chip, { source: "inline_chip" });
                              setMessages((prev) => prev.map(msg => msg.id === m.id ? { ...msg, chips: undefined } : msg));
                            }}
                            disabled={loading}
                            className="inline-flex items-center justify-center rounded-full border border-foreground/15 bg-background/50 px-3 py-1.5 text-[13px] font-medium text-foreground shadow-sm hover:bg-foreground hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                    {!loading && m.id !== "welcome" && m.content && (
                      <div className="mt-1 flex items-center gap-1.5 border-t border-foreground/5 pt-2">
                        <button
                          onClick={() => onFeedback(m.id, "up")}
                          className={`inline-flex items-center justify-center rounded-full p-1.5 transition-colors ${m.feedback === "up" ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"}`}
                          title="Buena respuesta"
                        >
                          <ThumbsUp weight={m.feedback === "up" ? "fill" : "regular"} className="size-4" />
                        </button>
                        <button
                          onClick={() => onFeedback(m.id, "down")}
                          className={`inline-flex items-center justify-center rounded-full p-1.5 transition-colors ${m.feedback === "down" ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"}`}
                          title="Mala respuesta"
                        >
                          <ThumbsDown weight={m.feedback === "down" ? "fill" : "regular"} className="size-4" />
                        </button>
                      </div>
                    )}
                  </>
                ) : loading ? (
                  <TypingDots label={statusLabel} />
                ) : null}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function TypingDots({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[13px] text-muted-foreground font-medium italic">{label || "Lumi está pensando"}</span>
      <span className="inline-flex gap-1.5 items-center">
        <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0ms" }} />
        <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "200ms" }} />
        <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "400ms" }} />
      </span>
    </div>
  );
}

function ProductMentionGroup({
  products,
  onUpdateProductReason,
}: {
  products: Product[];
  onUpdateProductReason?: (productId: string, reason: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {products.map((p, idx) => (
        <ProductMention 
          key={p.id} 
          product={p} 
          index={idx + 1} 
          onUpdateProductReason={onUpdateProductReason}
        />
      ))}
    </div>
  );
}

function ProductMention({
  product,
  index,
  onUpdateProductReason,
}: {
  product: Product;
  index: number;
  onUpdateProductReason?: (productId: string, reason: string) => void;
}) {
  const [localReason, setLocalReason] = useState(product.reason || "");
  const [loadingReason, setLoadingReason] = useState(false);
  const [reasonError, setReasonError] = useState(false);
  const isLoadingRef = useRef(false);
  const autoTriesRef = useRef(0);

  const loadReason = useCallback(() => {
    if (!product.query || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setReasonError(false);
    setLoadingReason(true);
    fetchProductReason(product.query, product)
      .then((reason) => {
        setLocalReason(reason);
        setReasonError(false);
        if (onUpdateProductReason) {
          onUpdateProductReason(product.id, reason);
        }
      })
      .catch((err) => {
        console.error("No se pudo obtener la razón del producto:", err);
        setReasonError(true);
      })
      .finally(() => {
        isLoadingRef.current = false;
        setLoadingReason(false);
      });
  }, [product, onUpdateProductReason]);

  useEffect(() => {
    if (!localReason && !reasonError && product.query && index <= 3 && autoTriesRef.current < 1) {
      autoTriesRef.current += 1;
      loadReason();
    }
  }, [localReason, reasonError, product.query, index, loadReason]);

  const retryReason = useCallback(() => {
    autoTriesRef.current = 0;
    setReasonError(false);
    loadReason();
  }, [loadReason]);

  const sources = (product.rag_source || product.source || "")
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="relative flex flex-col gap-2 p-2.5 rounded-[1.25rem] bg-background/75 border border-border/30 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.7),_0_2px_8px_-1px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3">
        <div className="shrink-0 size-9 rounded-xl bg-secondary overflow-hidden flex items-center justify-center border border-foreground/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
          <img
            src={getProductImage(product)}
            alt={product.name}
            className="size-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-foreground truncate tracking-tight">{product.name}</p>
          <p className="text-[11px] text-muted-foreground/70 truncate font-bold uppercase tracking-wider">{product.brand}</p>
        </div>
      </div>

      {(index <= 3 || localReason || loadingReason || reasonError) && (
        <div className="pl-11 pr-2 pb-1">
          {loadingReason ? (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-1">
              <CircleNotch weight="light" className="size-3.5 animate-spin" />
              <span className="italic">El especialista está analizando</span>
            </div>
          ) : reasonError ? (
            <div className="flex items-center gap-2 flex-wrap py-1">
              <span className="text-[12px] text-muted-foreground italic">No se pudo obtener la recomendación.</span>
              <button
                type="button"
                onClick={retryReason}
                className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-background/70 px-2.5 py-1 text-[11px] font-bold text-foreground/75 hover:text-foreground hover:bg-background transition"
              >
                <ArrowCounterClockwise weight="light" className="size-3.5" />
                <span>Reintentar</span>
              </button>
            </div>
          ) : localReason ? (
            <div className="flex flex-col gap-2">
              <div className="text-[12.5px] text-muted-foreground leading-relaxed">
                <Markdown content={localReason} />
              </div>
              {sources.length > 0 && (
                <div className="flex flex-col gap-1 pt-1.5 border-t border-foreground/5">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                    <BookOpen weight="light" className="size-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
                    <span>Fuente{sources.length > 1 ? "s" : ""}:</span>
                  </div>
                  <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide py-0.5 mt-0.5 -mx-1 px-1 max-w-full">
                    {sources.map((src, i) => (
                      <span
                        key={i}
                        className="inline-flex shrink-0 items-center rounded-md border border-emerald-500/10 bg-emerald-500/[0.04] px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 capitalize max-w-[150px] truncate"
                        title={src}
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
      {index > 3 && !localReason && !loadingReason && !reasonError && product.query && (
        <div className="pl-11 pr-2 pb-1">
          <button
            type="button"
            onClick={loadReason}
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-background/70 px-3 py-1.5 text-[11px] font-bold text-foreground/75 hover:text-foreground hover:bg-background transition"
          >
            <Sparkle weight="light" className="size-3.5" />
            <span>Preguntar por qué recomienda el #{index}</span>
          </button>
        </div>
      )}
    </div>
  );
}
