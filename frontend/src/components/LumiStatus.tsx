import { useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";
import { toast } from "sonner";

export function LumiStatus() {
  const [status, setStatus] = useState<"online" | "offline" | "checking">("checking");

  const verifyStatus = async (isManual = false) => {
    if (isManual) setStatus("checking");
    const ok = await checkHealth();
    setStatus(ok ? "online" : "offline");
    
    if (isManual) {
      if (ok) {
        toast.success("Lumi está de vuelta ✨", {
          description: "La conexión con el cerebro RAG se ha restablecido.",
        });
      } else {
        toast.error("Lumi no responde", {
          description: "Asegúrate de que el backend esté corriendo o intenta despertar de nuevo.",
        });
      }
    }
  };

  useEffect(() => {
    verifyStatus();
    // Check every 30 seconds
    const interval = setInterval(() => verifyStatus(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (status === "offline") {
    return (
      <button
        onClick={() => verifyStatus(true)}
        className="group flex size-9 items-center justify-center rounded-full bg-background/80 text-red-600 border border-red-200/50 hover:bg-red-500/15 active:scale-[0.98] transition-all duration-300 shadow-sm backdrop-blur-md"
        title="Intentar despertar a Lumi"
        aria-label="Lumi sin conexión. Intentar reconectar"
      >
        <div className="relative flex items-center justify-center">
          <span className="size-2 rounded-full bg-red-500 block relative z-10 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse" />
          <span className="absolute size-4 rounded-full bg-red-500/35 animate-ping opacity-60 pointer-events-none" />
        </div>
      </button>
    );
  }

  return (
    <div
      className="flex size-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/40 shadow-sm"
      title={status === "checking" ? "Lumi sincronizando" : "Lumi conectada"}
      aria-label={status === "checking" ? "Lumi sincronizando" : "Lumi conectada"}
    >
      <div className="relative flex items-center justify-center">
        <span 
          className={`size-2 rounded-full block transition-all duration-500 relative z-10 ${
            status === "online" 
              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" 
              : "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          }`} 
        />
        {status === "online" && (
          <span className="absolute size-4 rounded-full bg-emerald-400/35 animate-ping opacity-60 pointer-events-none" />
        )}
        {status === "checking" && (
          <span className="absolute size-4 rounded-full bg-amber-400/35 animate-ping opacity-60 pointer-events-none" />
        )}
      </div>
    </div>
  );
}
