import { useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClockCounterClockwise,
  Trash,
  ShoppingBag,
  Package,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { ChatSession } from "@/types/shop";
import { toast } from "sonner";

// ─── constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "lumi_chat_history";
const MAX_SESSIONS = 20;

// ─── persistence helpers ──────────────────────────────────────────────────────
export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

export function saveSession(session: ChatSession): void {
  try {
    const existing = loadSessions();
    const filtered = existing.filter((s) => s.id !== session.id);
    const updated = [session, ...filtered].slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn("No se pudo guardar la sesión en localStorage.");
  }
}

export function deleteSession(sessionId: string): void {
  try {
    const existing = loadSessions();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(existing.filter((s) => s.id !== sessionId))
    );
  } catch {
    console.warn("No se pudo eliminar la sesión del historial.");
  }
}

export function clearAllSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn("No se pudo limpiar el historial.");
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} min`;
  if (hours < 2) return "Hace 1 hora";
  if (hours < 24) return `Hace ${hours} horas`;
  if (days === 1) {
    const d = new Date(ts);
    return `Ayer · ${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }
  if (days < 7) return `Hace ${days} días`;
  return new Date(ts).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

function profileSummary(session: ChatSession): string | null {
  const p = session.clientProfile;
  if (!p) return null;
  const parts: string[] = [];
  if (p.skin_type) parts.push(p.skin_type);
  if (p.concern) parts.push(p.concern.replace(/_/g, " "));
  return parts.length > 0 ? parts.slice(0, 2).join(" · ") : null;
}

// ─── session card ─────────────────────────────────────────────────────────────
function SessionCard({
  session,
  index,
  onRestore,
  onDelete,
}: {
  session: ChatSession;
  index: number;
  onRestore: (s: ChatSession) => void;
  onDelete: (id: string) => void;
}) {
  const profile = profileSummary(session);
  const prodCount = session.recProductIds.length;
  const timeStr = relativeTime(session.timestamp);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, scale: 0.97 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 28,
        delay: index * 0.035,
      }}
      className="group relative glass-card rounded-[1.75rem] border border-foreground/5 cursor-pointer hover:border-foreground/10 hover:shadow-[0_8px_28px_-16px_hsl(235_28%_12%_/_0.18)] transition-all duration-200 active:scale-[0.985]"
      onClick={() => onRestore(session)}
      role="button"
      tabIndex={0}
      aria-label={`Restaurar conversación: ${session.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onRestore(session);
      }}
    >
      <div className="px-4 py-4 pr-10">
        {/* Eyebrow — time */}
        <p className="text-eyebrow mb-1.5">{timeStr}</p>

        {/* Title */}
        <p
          className="text-[13px] font-semibold text-foreground leading-snug"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {session.title}
        </p>

        {/* Badges row */}
        {(prodCount > 0 || profile) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {prodCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-muted-foreground border border-foreground/5">
                <Package weight="bold" className="size-2.5 shrink-0" />
                {prodCount} producto{prodCount !== 1 ? "s" : ""}
              </span>
            )}
            {profile && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 capitalize max-w-[150px] truncate">
                {profile}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Delete — visible on hover */}
      <button
        type="button"
        aria-label="Eliminar sesión"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.id);
        }}
        className="absolute top-3 right-3 size-7 rounded-full flex items-center justify-center
          text-muted-foreground hover:text-destructive hover:bg-destructive/5
          opacity-0 group-hover:opacity-100 transition-all duration-150 active:scale-95"
      >
        <Trash weight="light" className="size-4" />
      </button>
    </motion.div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: ChatSession[];
  onSessionsChange: (sessions: ChatSession[]) => void;
  onRestore: (session: ChatSession) => void;
};

export function ChatHistoryDrawer({
  open,
  onOpenChange,
  sessions,
  onSessionsChange,
  onRestore,
}: Props) {
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.timestamp - a.timestamp),
    [sessions]
  );

  function handleDelete(sessionId: string) {
    deleteSession(sessionId);
    onSessionsChange(loadSessions());
    toast.success("Conversación eliminada.");
  }

  function handleClearAll() {
    clearAllSessions();
    onSessionsChange([]);
    toast.success("Historial limpiado.");
  }

  function handleRestore(session: ChatSession) {
    onRestore(session);
    onOpenChange(false);
    toast.success("Conversación restaurada.");
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-start overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0 bg-foreground/12 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Panel — same spring as CartDrawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full sm:max-w-[360px] h-full glass-panel sm:rounded-r-[2.5rem] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex justify-between items-start gap-4 px-6 pt-7 pb-5 border-b border-foreground/8 shrink-0">
              <div>
                <p className="text-eyebrow mb-2">Sesiones</p>
                <h2 className="text-title">Historial</h2>
                <p className="mt-1 text-[12px] font-medium text-muted-foreground">
                  {sortedSessions.length > 0
                    ? `${sortedSessions.length} conversación${sortedSessions.length !== 1 ? "es" : ""} guardada${sortedSessions.length !== 1 ? "s" : ""}`
                    : "Sin conversaciones guardadas"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Cerrar historial"
                className="size-10 rounded-full bg-background/70 border border-foreground/10 flex items-center justify-center hover:bg-background transition shadow-sm shrink-0"
              >
                <X weight="light" className="size-5" />
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 flex flex-col gap-3">
              {sortedSessions.length === 0 ? (
                <EmptyState />
              ) : (
                <AnimatePresence initial={false} mode="popLayout">
                  {sortedSessions.map((session, i) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      index={i}
                      onRestore={handleRestore}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {sortedSessions.length > 0 && (
              <div className="shrink-0 px-4 py-5 border-t border-foreground/8">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="w-full text-[12px] font-bold text-muted-foreground hover:text-destructive transition inline-flex items-center justify-center gap-1.5"
                >
                  <Sparkle weight="light" className="size-3.5" />
                  Limpiar historial
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="h-full min-h-[360px] flex flex-col items-center justify-center text-center rounded-[2rem] border border-dashed border-foreground/12 bg-background/35 px-8"
    >
      <div className="size-14 rounded-[1.35rem] bg-foreground text-background flex items-center justify-center shadow-md mb-5">
        <ClockCounterClockwise weight="light" className="size-7" />
      </div>
      <h3 className="text-[16px] font-bold tracking-tight text-foreground">
        Sin historial aún
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground max-w-[230px]">
        Las conversaciones con Lumi se guardan automáticamente aquí al terminar.
      </p>
    </motion.div>
  );
}
