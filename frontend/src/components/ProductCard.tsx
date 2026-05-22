import { useState } from "react";
import { Product } from "@/types/shop";
import { useCart } from "@/hooks/useCart";
import { Plus } from "@phosphor-icons/react";
import { formatCLP } from "@/lib/format";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { getProductImage } from "@/lib/images";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  product: Product;
  highlighted?: boolean;
  isRecommended?: boolean;
  index: number;
};

// Bento Grid sizes based on index
const getSpanClasses = (index: number) => {
  if (index === 0) return "col-span-1 md:col-span-2 row-span-2"; // Hero card
  if (index % 4 === 0) return "col-span-1 md:col-span-2 row-span-1"; // Wide card
  return "col-span-1 row-span-1"; // Standard card
};

const getCalibratedScore = (score: number) => {
  // With cosine similarity, scores range from ~0.15 (low match) to ~0.85 (high match).
  // Map the meaningful range [0.20, 0.80] → [60%, 99%] for clear visual differentiation.
  const minRaw = 0.20;
  const maxRaw = 0.80;
  const minResult = 60;
  const maxResult = 99;
  
  const clamped = Math.max(minRaw, Math.min(maxRaw, score));
  const ratio = (clamped - minRaw) / (maxRaw - minRaw);
  return Math.round(minResult + ratio * (maxResult - minResult));
};

export function ProductCard({ product, highlighted, isRecommended, index }: Props) {
  const { add } = useCart();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const spanClasses = getSpanClasses(index);

  return (
    <>
      <motion.div
        layout
        layoutId={`product-${product.id}`}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 20,
          delay: index * 0.05, // Staggered orchestration
        }}
        className={`w-full flex flex-col group cursor-pointer ${spanClasses}`}
        onClick={() => setDetailsOpen(true)}
      >
        <motion.div
          whileHover={{ scale: 0.98, y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`relative flex-1 p-2 rounded-[2.5rem] ${
            highlighted ? "glass-panel" : "glass-card"
          }`}
        >
          <div className="bg-secondary rounded-[2rem] overflow-hidden w-full h-full min-h-[300px] relative">
            <img
              src={getProductImage(product)}
              alt={product.name}
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80";
              }}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 rounded-[2rem] outline outline-1 outline-foreground/10 -outline-offset-1" />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>

          {highlighted && (
            <div className="absolute top-6 right-6 px-4 py-2 bg-background/90 backdrop-blur-xl rounded-full text-badge text-foreground shadow-sm">
              Curated Match
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              add(product);
            }}
            aria-label={`Add ${product.name} to cart`}
            className="absolute bottom-6 right-6 size-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-glass-lg opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 hover:scale-110"
          >
            <Plus weight="bold" className="size-5" />
          </button>
        </motion.div>

        {/* Info rendered outside the card for clean gallery presentation */}
        <div className="pt-4 px-2 flex flex-col gap-1">
          <div className="flex justify-between items-start gap-4">
            <h3 className="text-product-name line-clamp-2">{product.name}</h3>
            <p className="text-price shrink-0">{formatCLP(product.price)}</p>
          </div>
          <p className="text-eyebrow mt-1">{product.brand}</p>
          {product.reason && (
            <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
              {product.reason}
            </p>
          )}
          {(product.skin_types || product.score) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {product.score != null && (
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[12px] font-semibold animate-fade-in">
                  Match: {getCalibratedScore(Number(product.score))}%
                </span>
              )}
              {product.skin_types?.map((st) => (
                <span key={st} className="px-2 py-0.5 rounded bg-secondary text-muted-foreground text-[12px] font-medium">
                  {st}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl w-[92vw] sm:rounded-[2.5rem] rounded-[2rem] p-2.5 overflow-hidden border border-white/20 shadow-glass-lg glass-panel max-h-[85vh] overflow-y-auto scrollbar-hide">
          {/* Inner core for concentric Double-Bezel hardware look */}
          <div className="bg-background/95 rounded-[2rem] overflow-hidden w-full h-full border border-black/5 dark:border-white/5 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.15)] flex flex-col md:grid md:grid-cols-12">
            <DialogHeader className="sr-only">
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription>{product.brand} - {product.category}</DialogDescription>
            </DialogHeader>

            {/* Left Section: Image (Double-Bezel nested container) */}
            <div className="col-span-1 md:col-span-5 relative min-h-[280px] md:min-h-full bg-secondary p-2">
              <div className="w-full h-full rounded-[1.5rem] overflow-hidden relative">
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-background/20 pointer-events-none" />
                
                {isRecommended && product.score != null && (
                  <div className="absolute top-4 left-4 px-3.5 py-1.5 bg-emerald-500/90 text-white backdrop-blur-xl rounded-full text-[10px] uppercase tracking-wider font-bold shadow-lg flex items-center gap-1.5 animate-fade-in border border-white/20">
                    <Sparkles className="size-3.5" />
                    Match: {getCalibratedScore(Number(product.score))}%
                  </div>
                )}
              </div>
            </div>

            {/* Right Section: Details */}
            <div className="col-span-1 md:col-span-7 p-6 md:p-8 flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-5">
                {/* Brand & Category */}
                <div>
                  <p className="text-eyebrow mb-1.5">{product.brand}</p>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground leading-tight">{product.name}</h3>
                </div>

                {/* Price & Badge */}
                <div className="flex justify-between items-center gap-4">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{formatCLP(product.price)}</p>
                  
                  {isRecommended && (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 animate-fade-in">
                      <Sparkles className="size-3" /> Recomendado por Lumi
                    </span>
                  )}
                </div>

                {/* RAG Recommendation Details (Double-bezel alert box) */}
                {isRecommended && product.reason && (
                  <div className="p-4 rounded-[1.25rem] bg-emerald-500/[0.03] border border-emerald-500/10 backdrop-blur-md flex flex-col gap-1.5 animate-fade-in">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-500 text-[12px] font-bold">
                      <Sparkles className="size-4" />
                      <span>¿Por qué Lumi lo seleccionó para ti?</span>
                    </div>
                    <p className="text-[12.5px] text-foreground/80 font-medium leading-relaxed">
                      {product.reason}
                    </p>
                  </div>
                )}

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground">Descripción</h4>
                  <p className="text-description text-foreground/85 text-[13.5px] leading-relaxed">
                    {product.description || "Este producto no cuenta con descripción detallada en este momento."}
                  </p>
                </div>

                {/* Tags & Badges */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground">Atributos del Producto</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Category Tag */}
                    {product.category && (
                      <span className="px-2.5 py-1 rounded-full bg-foreground/5 text-foreground/85 border border-foreground/10 text-[11px] font-bold uppercase tracking-wider">
                        {product.category.replace("_", " ")}
                      </span>
                    )}

                    {/* Skin Type Tags */}
                    {product.skin_types?.map((st) => (
                      <span key={st} className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border text-[11px] font-bold">
                        Piel {st}
                      </span>
                    ))}

                    {/* Benefits Tags (if present) */}
                    {product.benefits?.map((b) => (
                      <span key={b} className="px-2.5 py-1 rounded-full bg-blue-500/[0.04] text-blue-700 border border-blue-500/10 text-[11px] font-bold">
                        ✨ {b}
                      </span>
                    ))}

                    {/* Generic Tags if present in product.tags */}
                    {product.tags?.map((t) => (
                      <span key={t} className="px-2.5 py-1 rounded-full bg-purple-500/[0.04] text-purple-700 border border-purple-500/10 text-[11px] font-bold">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer / Add to Cart (Premium Button-in-Button structure) */}
              <div className="mt-4 pt-4 border-t border-border">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    add(product);
                    setDetailsOpen(false);
                  }}
                  className="group relative w-full bg-foreground text-background rounded-full py-2.5 pl-6 pr-2.5 text-cta hover:opacity-95 active:scale-[0.98] transition-all duration-300 flex items-center justify-between gap-4 font-bold border border-foreground/10"
                >
                  <span>Añadir al carrito</span>
                  <div className="w-9 h-9 rounded-full bg-background/25 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                    <Plus weight="bold" className="size-4 text-foreground" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

