import { useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";
import { RefreshCw, Power } from "lucide-react";
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
        className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 border border-red-200 dark:border-red-900/30 hover:bg-red-500/20 transition-all duration-300 shadow-sm"
        title="Intentar despertar a Lumi"
      >
        <div className="relative">
          <span className="size-1.5 rounded-full bg-red-500 block" />
          <span className="absolute inset-0 size-1.5 rounded-full bg-red-500 animate-ping opacity-75" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider">Desconectada</span>
        <Power className="size-3 ml-1 group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div className="px-3 py-1.5 rounded-full bg-background/60 text-badge text-muted-foreground border border-border/40 flex items-center gap-1.5">
      <div className="relative">
        <span 
          className={`size-1.5 rounded-full block transition-all duration-500 ${
            status === "online" 
              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
              : "bg-muted-foreground/30"
          }`} 
        />
        {status === "online" && (
           <span className="absolute inset-0 size-1.5 rounded-full bg-emerald-500 animate-pulse opacity-40" />
        )}
      </div>
      <span className="text-[11px] font-medium">
        {status === "checking" ? "Sincronizando..." : "Activa"}
      </span>
    </div>
  );
}
