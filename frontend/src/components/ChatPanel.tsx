import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChatMessage, ClientProfile, Product, QuestionSuggestion, ChatSession } from "@/types/shop";
import { ArrowUpRight, Gear, ArrowCounterClockwise, Sparkle, BookOpen, CircleNotch, Fire, CaretLeft, CaretRight, ClockCounterClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { streamChat, fetchProductReason, fetchQuestionSuggestions, getQuestionSessionId, trackQuestionEvent } from "@/lib/api";
import { FALLBACK_IMAGE_URL, getProductImage } from "@/lib/images";
import { useToast } from "@/components/ui/use-toast";
import { ChatProfile } from "./ChatProfile";
import ReactMarkdown from "react-markdown";
import { Markdown } from "./Markdown";
import { LumiStatus } from "./LumiStatus";
import { ChatHistoryDrawer, loadSessions, saveSession } from "./ChatHistoryDrawer";

type Props = {
  onRecommendations: (products: Product[], guides: unknown[]) => void;
  onClearChat: () => void;
  onProfile: (profile: ClientProfile) => void;
  clientProfile?: ClientProfile | null;
  onUpdateProductReason?: (productId: string, reason: string) => void;
  onRestoreSession?: (session: ChatSession) => void;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "¡Hola! Soy Lumi, tu asesora de belleza. Para darte mejores recomendaciones, te sugiero completar tu perfil aquí arriba. ¿Qué producto estás buscando hoy?",
};

const FALLBACK_QUESTION_SUGGESTIONS: QuestionSuggestion[] = [
  {
    id: "fallback-trending-perfume",
    text: "Busco un perfume amaderado para la noche",
    group: "trending",
    label: "Trending",
    score: 0,
    is_trending: true,
  },
  {
    id: "fallback-trending-glow",
    text: "Qué producto da efecto glow para un evento",
    group: "trending",
    label: "Trending",
    score: 0,
    is_trending: true,
  },
  {
    id: "fallback-frequent-crema-dia",
    text: "Busco una crema hidratante de día",
    group: "frequent",
    label: "Frecuentes",
    score: 0,
    is_trending: false,
  },
  {
    id: "fallback-frequent-serum-vit-c",
    text: "Qué sérums con vitamina C recomiendas",
    group: "frequent",
    label: "Frecuentes",
    score: 0,
    is_trending: false,
  },
  {
    id: "fallback-random-contorno",
    text: "Necesito un buen contorno de ojos",
    group: "specific",
    label: "Casos específicos",
    score: 0,
    is_trending: false,
  },
  {
    id: "fallback-random-limpiador",
    text: "Busco un limpiador que no reseque la piel",
    group: "specific",
    label: "Casos específicos",
    score: 0,
    is_trending: false,
  },
];

export function ChatPanel({
  onRecommendations,
  onClearChat,
  onProfile,
  clientProfile,
  onUpdateProductReason,
  onRestoreSession,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Etiqueta de progreso en vivo (analizando / buscando / preparando)
  const [statusLabel, setStatusLabel] = useState("");
  const [sessionId, setSessionId] = useState(() => getQuestionSessionId());
  const [suggestions, setSuggestions] = useState<QuestionSuggestion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySessions, setHistorySessions] = useState<ChatSession[]>(() => loadSessions());
  // Track the recommended products for the current session so we can persist them
  const currentRecProductsRef = useRef<Product[]>([]);
  const currentRecIdsRef = useRef<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeQuestionRef = useRef("");
  // RAF-based token batching: accumulate tokens between frames, flush once per rAF tick
  const tokenBatchRef = useRef("");
  const rafIdRef = useRef<number | null>(null);

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

  // Helper to generate the buyer-centric welcome message
  const getWelcomeMessage = useCallback(() => {
    if (!clientProfile) return INITIAL_MESSAGE;
    
    const skin = clientProfile.skin_type ? `piel ${clientProfile.skin_type}` : "";
    const age = clientProfile.age ? ` (${clientProfile.age} años)` : "";
    const text = `¡Hola! Ya tengo configurado tu perfil${age}${skin ? ' con ' + skin : ''}. ¿En qué te puedo ayudar hoy?`;
    
    const chips = [];
    if (clientProfile.skin_type === "seca") chips.push("Rutina súper hidratante", "Sérum luminoso");
    else if (clientProfile.skin_type === "grasa" || clientProfile.skin_type === "mixta") chips.push("Control de brillo", "Limpieza profunda");
    else chips.push("Skincare básico", "Rutina de día");
    
    if (clientProfile.age && Number(clientProfile.age) > 28) chips.push("Cuidado antiedad", "Contorno de ojos");
    else chips.push("Protección solar");

    return {
      id: "welcome",
      role: "assistant" as const,
      content: text,
      chips: chips.slice(0, 4)
    };
  }, [clientProfile]);

  // Buyer-centric: Replace the initial message dynamically based on the profile
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === "welcome" && messages[0] === INITIAL_MESSAGE && clientProfile) {
      setMessages([getWelcomeMessage()]);
    }
  }, [clientProfile, messages, getWelcomeMessage]);

  useEffect(() => {
    fetchQuestionSuggestions()
      .then((items) => setSuggestions(items))
      .catch((err) => {
        console.warn("No se pudieron cargar sugerencias de Lumi.", err);
        setSuggestions(FALLBACK_QUESTION_SUGGESTIONS);
      });
  }, [sessionId]);

  /** Derive a title from the first user message */
  function deriveTitle(msgs: ChatMessage[]): string {
    const firstUser = msgs.find((m) => m.role === "user");
    if (!firstUser) return "Consulta sin título";
    const text = firstUser.content.trim();
    return text.length > 72 ? text.slice(0, 69) + "…" : text;
  }

  /** Persist current session to localStorage if it has content */
  const persistCurrentSession = useCallback(
    (msgs: ChatMessage[]) => {
      const userCount = msgs.filter((m) => m.role === "user").length;
      if (userCount < 1) return;
      const session: ChatSession = {
        id: sessionId,
        title: deriveTitle(msgs),
        timestamp: Date.now(),
        messages: msgs,
        clientProfile: clientProfile ?? null,
        recProductIds: currentRecIdsRef.current,
        recProducts: currentRecProductsRef.current,
      };
      saveSession(session);
      setHistorySessions(loadSessions());
    },
    [sessionId, clientProfile]
  );

  const handleInternalUpdateProductReason = useCallback((productId: string, reason: string) => {
    // Update local messages so history has the reasons
    setMessages((prev) => {
      const next = prev.map((msg) => {
        if (!msg.products) return msg;
        const hasProduct = msg.products.some((p) => p.id === productId);
        if (!hasProduct) return msg;
        
        return {
          ...msg,
          products: msg.products.map((p) => p.id === productId ? { ...p, reason } : p)
        };
      });

      // Update refs for correct persistence
      currentRecProductsRef.current = currentRecProductsRef.current.map((p) => 
        p.id === productId ? { ...p, reason } : p
      );

      // Auto-save session immediately with the new reasons
      const userCount = next.filter((m) => m.role === "user").length;
      if (userCount >= 1) {
        const session: ChatSession = {
          id: sessionId,
          title: deriveTitle(next),
          timestamp: Date.now(),
          messages: next,
          clientProfile: clientProfile ?? null,
          recProductIds: currentRecIdsRef.current,
          recProducts: currentRecProductsRef.current,
        };
        saveSession(session);
        setHistorySessions(loadSessions());
      }

      return next;
    });

    // Notify parent
    onUpdateProductReason?.(productId, reason);
  }, [onUpdateProductReason, sessionId, clientProfile]);

  /** Reset everything — new session, empty history, clear parent catalog state */
  const handleClear = useCallback(() => {
    // Save current session before clearing, if it has real content
    setMessages((prev) => {
      const userCount = prev.filter((m) => m.role === "user").length;
      if (userCount >= 1) {
        const session: ChatSession = {
          id: sessionId,
          title: deriveTitle(prev),
          timestamp: Date.now(),
          messages: prev,
          clientProfile: clientProfile ?? null,
          recProductIds: currentRecIdsRef.current,
          recProducts: currentRecProductsRef.current,
        };
        saveSession(session);
        setHistorySessions(loadSessions());
      }
      return prev;
    });

    setMessages([{ ...INITIAL_MESSAGE, id: crypto.randomUUID() }]);
    const nextSessionId = crypto.randomUUID();
    window.sessionStorage.setItem("lumi_question_session_id", nextSessionId);
    setSessionId(nextSessionId);
    setInput("");
    currentRecProductsRef.current = [];
    currentRecIdsRef.current = [];
    activeQuestionRef.current = "";
    onClearChat();
    toast.success("Nueva conversación iniciada.");
  }, [onClearChat, sessionId, clientProfile]);

  async function send(text: string, meta: { suggestionId?: string; source?: string } = {}) {
    if (!text.trim() || loading) return;
    setInput("");
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);
    setStatusLabel("Lumi está pensando");

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

    // Build history for backend (excluding welcome and the current message we just added)
    const historyPayload = messages
      .filter((m) => m.id !== "welcome" && m.id !== userMessageId)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      await streamChat(text, sessionId, clientProfile || null, historyPayload, {
        onStatus: ({ label }) => {
          // Solo actualizar mientras no haya empezado a llegar contenido real.
          if (!hasToken && productCount === 0) setStatusLabel(label);
        },
        onProfile: (profile) => {
          onProfile(profile);
        },
        onProduct: (product) => {
          setStatusLabel("");
          streamedProducts = [...streamedProducts, product];
          productCount = streamedProducts.length;
          // keep refs in sync for persistence
          currentRecProductsRef.current = streamedProducts;
          currentRecIdsRef.current = streamedProducts.map((p) => p.id);
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
        onContextDone: ({ guides }) => {
          // Ya no inyectamos un "No encontré productos" prematuro: el backend
          // siempre stremea una respuesta (pregunta de perfilado, opción cercana
          // o recomendación). Dejar que el LLM hable evita el mensaje contradictorio.
          onRecommendations(streamedProducts, guides);
        },
        onToken: (token) => {
          setStatusLabel("");
          // If products were already found, append LLM commentary below the summary
          if (productCount > 0 && !hasToken) {
            assistantText =
              productCount === 1
                ? `Encontré **1 producto** relevante. Explora la tarjeta →\n\n`
                : `Encontré **${productCount} productos** relevantes. Explora las tarjetas →\n\n`;
            hasToken = true;
          }
          // Accumulate token in the batch buffer
          assistantText += token;
          tokenBatchRef.current += token;

          // Schedule a single DOM update per animation frame (RAF batching)
          if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(() => {
              rafIdRef.current = null;
              tokenBatchRef.current = "";
              const snapshot = assistantText;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: snapshot } : m
                )
              );
            });
          }
        },
        onChips: (chips) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, chips } : m
            )
          );
        },
      }, abortControllerRef.current.signal);
      // Flush any remaining buffered tokens after stream ends
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      tokenBatchRef.current = "";
      if (assistantText) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, content: assistantText } : m
          )
        );
      }
      completed = true;
      // Auto-save after each completed exchange (≥2 messages means at least 1 Q&A)
      setMessages((prev) => {
        persistCurrentSession(prev);
        return prev;
      });
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
      setStatusLabel("");
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
    <>
    <ChatHistoryDrawer
      open={historyOpen}
      onOpenChange={setHistoryOpen}
      sessions={historySessions}
      onSessionsChange={setHistorySessions}
      onRestore={(session) => {
        // restore local chat state
        setMessages(session.messages);
        setSessionId(session.id);
        window.sessionStorage.setItem("lumi_question_session_id", session.id);
        currentRecProductsRef.current = session.recProducts;
        currentRecIdsRef.current = session.recProductIds;
        // let parent restore catalog state
        onRestoreSession?.(session);
      }}
    />
    <div className="w-full min-h-[calc(100dvh-4rem)] lg:min-h-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-2rem)] flex flex-col glass-panel rounded-[2.5rem] p-6 lg:p-8 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="icon-orb size-10 rounded-[1.15rem] bg-foreground text-background border-foreground/10">
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M12 3 Q12 12 21 12 Q12 12 12 21 Q12 12 3 12 Q12 12 3 12 Q12 12 12 3 Z" />
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

          {/* Historial */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setHistoryOpen(true)}
            title="Historial de conversaciones"
            aria-label="Abrir historial de conversaciones"
            className="icon-orb size-9 rounded-full hover:bg-muted text-foreground transition-all duration-200 hover:scale-105 relative"
          >
            <ClockCounterClockwise weight="light" className="size-4" />
            {historySessions.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500/80 border border-background" />
            )}
          </motion.button>

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

      <ChatProfile profile={clientProfile} onUpdate={onProfile} />

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
                          <ProductMentionGroup products={m.products} onUpdateProductReason={handleInternalUpdateProductReason} />
                        </div>
                      )}
                      {m.chips && m.chips.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.chips.map((chip, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                send(chip, { source: "inline_chip" });
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

      <QuestionSuggestionRail
        suggestions={suggestions}
        sessionId={sessionId}
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
    </>
  );
}

function QuestionSuggestionRail({
  suggestions,
  sessionId,
  disabled,
  onPick,
}: {
  suggestions: QuestionSuggestion[];
  sessionId: string;
  disabled: boolean;
  onPick: (suggestion: QuestionSuggestion) => void;
}) {
  const [activeSection, setActiveSection] = useState<"mixed" | "trending" | "frequent">("mixed");
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [direction, setDirection] = useState(1);
  const railRef = useRef<HTMLDivElement>(null);
  const impressedSuggestionIds = useRef<Set<string>>(new Set());
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const updateVisibleCount = () => {
      const width = rail.getBoundingClientRect().width;
      if (width >= 900) setVisibleCount(5);
      else if (width >= 720) setVisibleCount(4);
      else if (width >= 620) setVisibleCount(3);
      else if (width >= 520) setVisibleCount(2);
      else setVisibleCount(1);
    };

    updateVisibleCount();
    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(rail);
    return () => observer.disconnect();
  }, []);

  const { frequent, trending, specific } = useMemo(() => ({
    frequent: suggestions.filter((item) => item.group === "frequent"),
    trending: suggestions.filter((item) => item.group === "trending"),
    specific: suggestions.filter((item) => item.group === "specific"),
  }), [suggestions]);

  const safePool = useMemo(() => {
    if (activeSection === "trending") return trending.length > 0 ? trending : suggestions;
    if (activeSection === "frequent") return frequent.length > 0 ? frequent : suggestions;

    const mixed = [
      ...specific,
      ...trending.slice(0, 2),
      ...frequent.slice(0, 2),
      ...trending.slice(2),
      ...frequent.slice(2),
    ];
    return mixed.length > 0 ? mixed : suggestions;
  }, [activeSection, frequent, specific, suggestions, trending]);

  const pageSize = Math.max(1, Math.min(visibleCount, safePool.length || 1));
  const canNavigate = safePool.length > 1;

  const visibleSuggestions = useMemo(() => {
    if (safePool.length === 0) return [];
    return Array.from({ length: pageSize }, (_, index) => safePool[(startIndex + index) % safePool.length]);
  }, [pageSize, safePool, startIndex]);

  useEffect(() => {
    if (startIndex >= safePool.length) setStartIndex(0);
  }, [safePool.length, startIndex]);

  useEffect(() => {
    visibleSuggestions.forEach((suggestion) => {
      const impressionKey = `${activeSection}:${suggestion.id}`;
      if (impressedSuggestionIds.current.has(impressionKey)) return;
      impressedSuggestionIds.current.add(impressionKey);
      trackQuestionEvent({
        event_type: "impression",
        session_id: sessionId,
        question: suggestion.text,
        suggestion_id: suggestion.id,
        source: `chip_${activeSection}`,
      });
    });
  }, [activeSection, sessionId, visibleSuggestions]);

  if (suggestions.length === 0 || safePool.length === 0) return null;

  const selectSection = (section: "trending" | "frequent") => {
    setDirection(1);
    setActiveSection((current) => (current === section ? "mixed" : section));
    setStartIndex(0);
  };

  const movePage = (direction: -1 | 1) => {
    if (!canNavigate) return;
    setDirection(direction);
    const step = safePool.length <= pageSize ? 1 : pageSize;
    setStartIndex((current) => (current + direction * step + safePool.length) % safePool.length);
  };

  const slideVariants = {
    enter: (incomingDirection: number) => ({
      opacity: reduceMotion ? 1 : 0,
      x: reduceMotion ? 0 : incomingDirection * 18,
      scale: reduceMotion ? 1 : 0.98,
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    exit: (incomingDirection: number) => ({
      opacity: reduceMotion ? 1 : 0,
      x: reduceMotion ? 0 : incomingDirection * -18,
      scale: reduceMotion ? 1 : 0.98,
    }),
  };

  return (
    <div ref={railRef} className="mb-3 pt-2 shrink-0 animate-fade-in">
      <div className="min-w-0 overflow-hidden rounded-[1.45rem] bg-background/25 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
        <div className="flex min-w-0 flex-nowrap items-center gap-1.5 whitespace-nowrap">
          <motion.button
            type="button"
            onClick={() => movePage(-1)}
            disabled={disabled || !canNavigate}
            aria-label="Ver preguntas anteriores"
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-background/48 text-foreground transition hover:bg-background/75 disabled:opacity-25"
          >
            <CaretLeft weight="bold" className="size-4" />
          </motion.button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden">
            {(activeSection === "mixed" || activeSection === "trending") && (
              <motion.button
                layout
                type="button"
                onClick={() => selectSection("trending")}
                disabled={disabled || trending.length === 0}
                aria-pressed={activeSection === "trending"}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                className={`inline-flex h-8 min-w-[5.9rem] shrink-0 items-center justify-center rounded-full px-3 text-[12px] font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-40 ${
                  activeSection === "trending"
                    ? "bg-foreground text-background shadow-sm ring-2 ring-foreground/12"
                    : "bg-foreground text-background shadow-sm opacity-85 hover:opacity-100"
                }`}
              >
                Trending
              </motion.button>
            )}

            {(activeSection === "mixed" || activeSection === "frequent") && (
              <motion.button
                layout
                type="button"
                onClick={() => selectSection("frequent")}
                disabled={disabled || frequent.length === 0}
                aria-pressed={activeSection === "frequent"}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                className={`inline-flex h-8 min-w-[6.6rem] shrink-0 items-center justify-center rounded-full px-3 text-[12px] font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-40 ${
                  activeSection === "frequent"
                    ? "bg-foreground text-background shadow-sm ring-2 ring-foreground/12"
                    : "bg-foreground text-background shadow-sm opacity-85 hover:opacity-100"
                }`}
              >
                Frecuentes
              </motion.button>
            )}
          </div>

          <motion.button
            type="button"
            onClick={() => movePage(1)}
            disabled={disabled || !canNavigate}
            aria-label="Ver más preguntas"
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-background/48 text-foreground transition hover:bg-background/75 disabled:opacity-25"
          >
            <CaretRight weight="bold" className="size-4" />
          </motion.button>
        </div>

        <motion.div layout className="relative mt-1.5 flex min-w-0 items-center overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            <motion.div
              key={`${activeSection}-${startIndex}-${pageSize}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-w-0 flex-1 items-center gap-1.5"
            >
              {visibleSuggestions.map((suggestion, index) => (
                <motion.button
                  layout
                  key={`${suggestion.id}-${index}`}
                  type="button"
                  onClick={() => onPick(suggestion)}
                  disabled={disabled}
                  whileHover={reduceMotion ? undefined : { y: -1 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="inline-flex h-8 min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 truncate rounded-full border border-foreground/18 bg-background/64 px-3 text-[11px] font-bold text-foreground/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] transition-colors duration-200 hover:border-foreground/35 hover:bg-background/90 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion.is_trending ? <Fire weight="fill" className="size-3 shrink-0 text-orange-500" /> : null}
                  <span className="min-w-0 truncate">{suggestion.text}</span>
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>
        </motion.div>
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
  // Solo analizamos/renderizamos en profundidad los 3 primeros, pero listamos el resto sin analizar
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
  // Cuántas veces reintentó automáticamente (evita bucles infinitos en el useEffect)
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
        // No contaminamos localReason con el error: usamos un estado aparte
        // para poder ofrecer un botón de reintento.
        setReasonError(true);
      })
      .finally(() => {
        isLoadingRef.current = false;
        setLoadingReason(false);
      });
  }, [product, onUpdateProductReason]);

  useEffect(() => {
    // Pedir la razón automáticamente al montar (solo para los 3 primeros).
    // Reintenta una vez de forma automática ante un fallo transitorio.
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
