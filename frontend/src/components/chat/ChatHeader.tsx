import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowCounterClockwise, Gear, ClockCounterClockwise } from "@phosphor-icons/react";
import { LumiStatus } from "../LumiStatus";

type ChatHeaderProps = {
  hasHistory: boolean;
  onOpenHistory: () => void;
  showClearButton: boolean;
  onClear: () => void;
  loading: boolean;
};

export function ChatHeader({
  hasHistory,
  onOpenHistory,
  showClearButton,
  onClear,
  loading,
}: ChatHeaderProps) {
  return (
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
          onClick={onOpenHistory}
          title="Historial de conversaciones"
          aria-label="Abrir historial de conversaciones"
          className="icon-orb size-9 rounded-full hover:bg-muted text-foreground transition-all duration-200 hover:scale-105 relative"
        >
          <ClockCounterClockwise weight="light" className="size-4" />
          {hasHistory && (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500/80 border border-background" />
          )}
        </motion.button>

        {/* Nueva consulta */}
        {showClearButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onClear}
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
  );
}
