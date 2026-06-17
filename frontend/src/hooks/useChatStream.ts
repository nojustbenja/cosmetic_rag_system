import { useState, useRef, useCallback, useEffect } from "react";
import { ChatMessage, ClientProfile, Product, QuestionSuggestion, ChatSession } from "@/types/shop";
import { streamChat, fetchQuestionSuggestions, getQuestionSessionId, trackQuestionEvent } from "@/lib/api";
import { toast } from "sonner";
import { loadSessions, saveSession } from "@/utils/storage";

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

type UseChatStreamProps = {
  clientProfile?: ClientProfile | null;
  onProfile: (profile: ClientProfile) => void;
  onRecommendations: (products: Product[], guides: unknown[]) => void;
  onClearChat: () => void;
  onUpdateProductReason?: (productId: string, reason: string) => void;
  onRestoreSession?: (session: ChatSession) => void;
};

export function useChatStream({
  clientProfile,
  onProfile,
  onRecommendations,
  onClearChat,
  onUpdateProductReason,
  onRestoreSession,
}: UseChatStreamProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState("");
  const [sessionId, setSessionId] = useState(() => getQuestionSessionId());
  const [suggestions, setSuggestions] = useState<QuestionSuggestion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySessions, setHistorySessions] = useState<ChatSession[]>(() => loadSessions());
  
  const currentRecProductsRef = useRef<Product[]>([]);
  const currentRecIdsRef = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeQuestionRef = useRef("");
  const tokenBatchRef = useRef("");
  const rafIdRef = useRef<number | null>(null);

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

  function deriveTitle(msgs: ChatMessage[]): string {
    const firstUser = msgs.find((m) => m.role === "user");
    if (!firstUser) return "Consulta sin título";
    const text = firstUser.content.trim();
    return text.length > 72 ? text.slice(0, 69) + "…" : text;
  }

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

      currentRecProductsRef.current = currentRecProductsRef.current.map((p) => 
        p.id === productId ? { ...p, reason } : p
      );

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

    onUpdateProductReason?.(productId, reason);
  }, [onUpdateProductReason, sessionId, clientProfile]);

  const handleClear = useCallback(() => {
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

    const historyPayload = messages
      .filter((m) => m.id !== "welcome" && m.id !== userMsg.id)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      await streamChat(text, sessionId, clientProfile || null, historyPayload, {
        onStatus: ({ label }) => {
          if (!hasToken && productCount === 0) setStatusLabel(label);
        },
        onProfile: (profile) => {
          onProfile(profile);
        },
        onProduct: (product) => {
          setStatusLabel("");
          streamedProducts = [...streamedProducts, product];
          productCount = streamedProducts.length;
          currentRecProductsRef.current = streamedProducts;
          currentRecIdsRef.current = streamedProducts.map((p) => p.id);
          onRecommendations(streamedProducts, []);

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
          onRecommendations(streamedProducts, guides);
        },
        onToken: (token) => {
          setStatusLabel("");
          if (productCount > 0 && !hasToken) {
            assistantText =
              productCount === 1
                ? `Encontré **1 producto** relevante. Explora la tarjeta →\n\n`
                : `Encontré **${productCount} productos** relevantes. Explora las tarjetas →\n\n`;
            hasToken = true;
          }
          assistantText += token;
          tokenBatchRef.current += token;

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

  function restoreSession(session: ChatSession) {
    setMessages(session.messages);
    setSessionId(session.id);
    window.sessionStorage.setItem("lumi_question_session_id", session.id);
    currentRecProductsRef.current = session.recProducts;
    currentRecIdsRef.current = session.recProductIds;
    onRestoreSession?.(session);
  }

  return {
    messages,
    setMessages,
    input,
    setInput,
    loading,
    statusLabel,
    sessionId,
    suggestions,
    historyOpen,
    setHistoryOpen,
    historySessions,
    setHistorySessions,
    send,
    handleStop,
    handleClear,
    handleInternalUpdateProductReason,
    restoreSession,
  };
}
