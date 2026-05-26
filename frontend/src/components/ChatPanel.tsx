import { useEffect, useRef, useState, useCallback } from "react";
import { ChatMessage, ClientProfile, Product, QuestionSuggestion } from "@/types/shop";
import { ArrowUpRight, Gear, ArrowCounterClockwise, Sparkle, CircleNotch, Fire, TrendUp } from "@phosphor-icons/react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { streamChat, fetchProductReason, fetchQuestionSuggestions, getQuestionSessionId, trackQuestionEvent } from "@/lib/api";
import { FALLBACK_IMAGE_URL, getProductImage } from "@/lib/images";
import { Markdown } from "./Markdown";
import { LumiStatus } from "./LumiStatus";

type Props = {
  onRecommendations: (products: Product[], guides: unknown[]) => void;
  onClearChat: () => void;
  onProfile: (profile: ClientProfile) => void;
  clientProfile?: ClientProfile | null;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hola. Describe el perfil del cliente y te ayudo a recomendar productos del catalogo cargado.",
};

export function ChatPanel({ onRecommendations, onClearChat, onProfile, clientProfile }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => getQuestionSessionId());
  const [suggestions, setSuggestions] = useState<QuestionSuggestion[]>([]);
  const [rotation, setRotation] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeQuestionRef = useRef("");
  const impressedSuggestionIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const performScroll = () => {
      // During active token streaming, use "auto" (instant) scroll to prevent animation queue buildup.
      // Use premium "smooth" scroll only on full message completion.
      el.scrollTo({
        top: el.scrollHeight,
        behavior: loading ? "auto" : "smooth",
      });
    };

    const frameId = requestAnimationFrame(performScroll);
    return () => cancelAnimationFrame(frameId);
  }, [messages, loading]);

  useEffect(() => {
    fetchQuestionSuggestions()
      .then((items) => {
        setSuggestions(items);
        items.forEach((item) => {
          if (impressedSuggestionIds.current.has(item.id)) return;
          impressedSuggestionIds.current.add(item.id);
          trackQuestionEvent({
            event_type: "impression",
            session_id: sessionId,
            question: item.text,
            suggestion_id: item.id,
            source: "chip",
          });
        });
      })
      .catch((err) => {
        console.warn("No se pudieron cargar sugerencias de Lumi.", err);
      });
  }, [sessionId]);

  useEffect(() => {
    if (suggestions.length === 0) return;
    const timer = window.setInterval(() => setRotation((value) => value + 1), 12000);
    return () => window.clearInterval(timer);
  }, [suggestions.length]);

  /** Reset everything — new session, empty history, clear parent catalog state */
  const handleClear = useCallback(() => {
    setMessages([{ ...INITIAL_MESSAGE, id: crypto.randomUUID() }]);
    const nextSessionId = crypto.randomUUID();
    window.sessionStorage.setItem("lumi_question_session_id", nextSessionId);
    setSessionId(nextSessionId);
    setInput("");
    activeQuestionRef.current = "";
    onClearChat();
    toast.success("Nueva conversación iniciada.");
  }, [onClearChat]);

  async function send(text: string, meta: { suggestionId?: string; source?: string } = {}) {
    if (!text.trim() || loading) return;
    setInput("");
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    let assistantText = "";
    let productCount = 0;
    let hasToken = false;
    let completed = false;
    const assistantMessageId = crypto.randomUUID();
    let streamedProducts: Product[] = [];
    activeQuestionRef.current = text;

    // Show a lightweight "thinking" placeholder immediately
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      },
    ]);

    abortControllerRef.current = new AbortController();
    trackQuestionEvent({
      event_type: "sent",
      session_id: sessionId,
      question: text,
      suggestion_id: meta.suggestionId || "",
      source: meta.source || "typed",
    });

    try {
      await streamChat(text, sessionId, {
        onProfile: (profile) => {
          onProfile(profile);
        },
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
      }, abortControllerRef.current.signal);
      completed = true;
      trackQuestionEvent({
        event_type: "answered",
        session_id: sessionId,
        question: text,
        suggestion_id: meta.suggestionId || "",
        source: meta.source || "chat",
        product_ids: streamedProducts.map((product) => product.id),
      });
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // Ignorar si fue detenido por el usuario
        return;
      }
      console.error(e);
      const message = e instanceof Error ? e.message : "Error de conexión con RAG.";
      toast.error(message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: "Error inesperado al consultar el RAG." }
            : m
        )
      );
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      if (completed) activeQuestionRef.current = "";
    }
  }

  function handleStop() {
    if (abortControllerRef.current) {
      trackQuestionEvent({
        event_type: "stop",
        session_id: sessionId,
        question: activeQuestionRef.current,
        source: "chat",
      });
      abortControllerRef.current.abort();
      setLoading(false);
      abortControllerRef.current = null;
    }
  }

  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] lg:min-h-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-2rem)] flex flex-col glass-panel rounded-[2.5rem] p-6 lg:p-8 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="icon-orb size-10 rounded-[1.15rem] bg-foreground text-background border-foreground/10">
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
              className="icon-orb size-9 rounded-full hover:bg-muted text-foreground transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowCounterClockwise weight="light" className="size-4" />
            </motion.button>
          )}

          <Link
            to="/admin"
            title="Panel de Control (Back Office)"
            className="hidden sm:flex icon-orb size-9 rounded-full hover:bg-muted text-foreground transition-all duration-200 hover:scale-105"
          >
            <Gear weight="light" className="size-4" />
          </Link>
        </div>
      </div>

      {clientProfile && (
        <ClientProfileCard profile={clientProfile} />
      )}

      {/* Messages */}
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

      <QuestionSuggestionRail
        suggestions={suggestions}
        rotation={rotation}
        disabled={loading}
        onPick={(suggestion) => {
          trackQuestionEvent({
            event_type: "click",
            session_id: sessionId,
            question: suggestion.text,
            suggestion_id: suggestion.id,
            source: "chip",
          });
          send(suggestion.text, { suggestionId: suggestion.id, source: "chip" });
        }}
      />

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input, { source: "typed" });
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
          {loading ? (
            <button
              type="button"
              onClick={handleStop}
              aria-label="Detener generación"
              className="size-10 rounded-full bg-red-500/10 text-red-600 border border-red-500/15 flex items-center justify-center hover:bg-red-500/18 hover:shadow-[0_10px_26px_-18px_rgba(220,38,38,0.7)] active:scale-95 transition-all"
            >
              <div className="size-3.5 bg-current rounded-[0.35rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Enviar mensaje"
              className="size-10 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-transform"
            >
              <ArrowUpRight weight="light" className="size-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function QuestionSuggestionRail({
  suggestions,
  rotation,
  disabled,
  onPick,
}: {
  suggestions: QuestionSuggestion[];
  rotation: number;
  disabled: boolean;
  onPick: (suggestion: QuestionSuggestion) => void;
}) {
  if (suggestions.length === 0) return null;

  const groups = [
    { id: "frequent", label: "Frecuentes" },
    { id: "trending", label: "Trending" },
    { id: "specific", label: "Casos específicos" },
  ].map((group) => {
    const items = suggestions.filter((item) => item.group === group.id);
    if (items.length <= 1) return { ...group, items };
    const offset = rotation % items.length;
    return { ...group, items: [...items.slice(offset), ...items.slice(0, offset)] };
  });

  return (
    <div className="mb-3 pt-2 shrink-0 animate-fade-in">
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap scrollbar-hide pb-1">
        {groups.map((group) =>
          group.items.length > 0 ? (
            <div key={group.id} className="inline-flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-foreground/8 bg-background/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {group.id === "trending" ? <TrendUp weight="bold" className="size-3" /> : null}
                {group.label}
              </span>
              {group.items.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => onPick(suggestion)}
                  disabled={disabled}
                  className="inline-flex max-w-[76vw] items-center gap-1.5 truncate rounded-full border border-border/45 bg-background/45 px-3.5 py-2 text-[12px] font-bold text-muted-foreground/85 transition-all duration-300 hover:border-foreground/20 hover:bg-background/85 hover:text-foreground hover:shadow-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-none"
                >
                  {suggestion.is_trending ? <Fire weight="fill" className="size-3.5 text-orange-500" /> : null}
                  <span className="truncate">{suggestion.text}</span>
                  {suggestion.is_trending ? (
                    <span className="hidden rounded-full bg-orange-500/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-orange-600 sm:inline">
                      Trending
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function ClientProfileCard({ profile }: { profile: ClientProfile }) {
  const chips = [
    profile.skin_type && `Piel ${profile.skin_type}`,
    profile.concern && labelize(profile.concern),
    profile.category && labelize(profile.category),
    profile.usage_moment && `Uso ${profile.usage_moment}`,
    profile.budget_max ? `Hasta $${profile.budget_max.toLocaleString("es-CL")}` : "",
    profile.sensitivity ? "Sensible" : "",
    profile.fragrance_family && labelize(profile.fragrance_family),
  ].filter(Boolean) as string[];

  return (
    <div className="mb-5 shrink-0 rounded-[1.75rem] border border-foreground/8 bg-background/42 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Ficha cliente</p>
        {profile.confidence != null && (
          <span className="text-[10px] font-bold text-foreground/60 tabular-nums">
            {Math.round(profile.confidence * 100)}%
          </span>
        )}
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full border border-foreground/10 bg-background/65 px-2.5 py-1 text-[11px] font-bold text-foreground/75 capitalize">
              {chip}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[12px] font-medium text-muted-foreground">Lumi todavía está reuniendo señales del cliente.</p>
      )}
      {profile.missing_fields && profile.missing_fields.length > 0 && (
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">
          Falta preguntar: {profile.missing_fields.join(", ")}.
        </p>
      )}
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
  // Solo analizamos/renderizamos en profundidad los 3 primeros, pero listamos el resto sin analizar
  return (
    <div className="flex flex-col gap-3">
      {products.map((p, idx) => (
        <ProductMention 
          key={p.id} 
          product={p} 
          index={idx + 1} 
        />
      ))}
    </div>
  );
}

function ProductMention({ product, index }: { product: Product; index: number }) {
  const [localReason, setLocalReason] = useState(product.reason || "");
  const [loadingReason, setLoadingReason] = useState(false);

  const loadReason = useCallback(() => {
    if (!product.query || loadingReason) return;
    setLoadingReason(true);
    fetchProductReason(product.query, product)
      .then(reason => setLocalReason(reason))
      .catch(err => {
        console.error(err);
        setLocalReason("No se pudo obtener la recomendación.");
      })
      .finally(() => setLoadingReason(false));
  }, [loadingReason, product]);

  useEffect(() => {
    // Si no tenemos la razón local, pedirla automáticamente al montar (solo para los 3 primeros)
    if (!localReason && product.query && index <= 3) {
      loadReason();
    }
  }, [localReason, product.query, index, loadReason]);

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

      {(index <= 3 || localReason || loadingReason) && (
        <div className="pl-11 pr-2 pb-1">
          {loadingReason ? (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-1">
              <CircleNotch weight="light" className="size-3.5 animate-spin" />
              <span className="italic">El especialista está analizando</span>
            </div>
          ) : localReason ? (
            <div className="text-[12.5px] text-muted-foreground leading-relaxed">
              <Markdown content={localReason} />
            </div>
          ) : null}
        </div>
      )}
      {index > 3 && !localReason && !loadingReason && product.query && (
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
