import { useEffect, useMemo, useRef, useState } from "react";
import { ClientProfile, Product, QuestionSuggestion, ChatSession } from "@/types/shop";
import { Fire, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { trackQuestionEvent } from "@/lib/api";
import { ChatProfile } from "./ChatProfile";
import { ChatHistoryDrawer } from "./ChatHistoryDrawer";
import { useChatStream } from "@/hooks/useChatStream";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatMessageList } from "./chat/ChatMessageList";
import { ChatInputArea } from "./chat/ChatInputArea";

type Props = {
  onRecommendations: (products: Product[], guides: unknown[]) => void;
  onClearChat: () => void;
  onProfile: (profile: ClientProfile) => void;
  clientProfile?: ClientProfile | null;
  onUpdateProductReason?: (productId: string, reason: string) => void;
  onRestoreSession?: (session: ChatSession) => void;
};

export function ChatPanel({
  onRecommendations,
  onClearChat,
  onProfile,
  clientProfile,
  onUpdateProductReason,
  onRestoreSession,
}: Props) {
  const {
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
  } = useChatStream({
    clientProfile,
    onProfile,
    onRecommendations,
    onClearChat,
    onUpdateProductReason,
    onRestoreSession,
  });

  return (
    <>
      <ChatHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        sessions={historySessions}
        onSessionsChange={setHistorySessions}
        onRestore={restoreSession}
      />
      <div className="w-full min-h-[calc(100dvh-4rem)] lg:min-h-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-2rem)] flex flex-col glass-panel rounded-[2.5rem] p-6 lg:p-8 overflow-hidden">
        
        <ChatHeader
          hasHistory={historySessions.length > 0}
          onOpenHistory={() => setHistoryOpen(true)}
          showClearButton={messages.length > 1}
          onClear={handleClear}
          loading={loading}
        />

        <ChatProfile profile={clientProfile} onUpdate={onProfile} />

        <ChatMessageList
          messages={messages}
          loading={loading}
          statusLabel={statusLabel}
          onSendChip={send}
          setMessages={setMessages}
          onUpdateProductReason={handleInternalUpdateProductReason}
        />

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

        <ChatInputArea
          input={input}
          setInput={setInput}
          loading={loading}
          onSend={send}
          onStop={handleStop}
        />
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
