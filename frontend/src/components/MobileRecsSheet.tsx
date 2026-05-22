import { useEffect, useState } from "react";
import { Product } from "@/types/shop";
import { ProductStage } from "./ProductStage";
import { X } from "lucide-react";

type Props = {
  products: Product[];
  recIds: string[];
};

export function MobileRecsSheet({ products, recIds }: Props) {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Cada vez que cambian las recomendaciones, abrimos pulso de atención
  useEffect(() => {
    if (recIds.length > 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 4000);
      return () => clearTimeout(t);
    }
  }, [recIds]);

  if (recIds.length === 0) return null;

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => {
          setOpen(true);
          setPulse(false);
        }}
        aria-label={`Ver ${recIds.length} productos recomendados por Lumi`}
        className="lg:hidden fixed top-7 left-1/2 -translate-x-1/2 z-40 glass-panel rounded-full pl-2.5 pr-4 py-1.5 flex items-center gap-2 shadow-[0_12px_40px_hsl(220_25%_12%/0.18)] animate-float-up active:scale-95 transition-transform"
      >
        {/* Halo pulsante */}
        {pulse && (
          <span className="absolute inset-0 rounded-full bg-foreground/10 animate-ping" />
        )}
        <span className="relative size-7 rounded-full bg-foreground text-background flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
            <path d="M12 3 Q12 12 21 12 Q12 12 12 21 Q12 12 3 12 Q12 12 12 3 Z" />
            <path d="M19 3 Q19 6 22 6 Q19 6 19 9 Q19 6 16 6 Q19 6 19 3 Z" className="opacity-70" />
          </svg>
        </span>
        <span className="relative text-[12px] font-bold text-foreground leading-tight whitespace-nowrap">
          Ver {recIds.length} recomendado{recIds.length !== 1 ? "s" : ""}
        </span>
        <span className="relative size-2 rounded-full bg-emerald-500 animate-pulse-dot" />
      </button>

      {/* Sheet */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end animate-fade-in">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-[85dvh] glass-panel rounded-t-[2.5rem] overflow-hidden flex flex-col animate-float-up">
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-foreground/15 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 text-foreground shrink-0">
                  <path d="M12 3 Q12 12 21 12 Q12 12 12 21 Q12 12 3 12 Q12 12 12 3 Z" />
                  <path d="M19 3 Q19 6 22 6 Q19 6 19 9 Q19 6 16 6 Q19 6 19 3 Z" className="opacity-75" />
                </svg>
                <h2 className="text-subtitle">Curado por Lumi</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="size-9 rounded-full bg-secondary flex items-center justify-center hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <ProductStage products={products} recIds={recIds} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
