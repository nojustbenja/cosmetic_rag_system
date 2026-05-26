import { useState, useEffect, useRef } from "react";
import { ClientProfile, Product, ProductAction, ProductActionResult } from "@/types/shop";
import { useCart } from "@/hooks/useCart";
import { Plus, Sparkle, BookOpen, CircleNotch } from "@phosphor-icons/react";
import { formatCLP } from "@/lib/format";
import { motion } from "framer-motion";
import { FALLBACK_IMAGE_URL, getProductImage } from "@/lib/images";
import { fetchProductAction, fetchProductReason, trackQuestionEvent } from "@/lib/api";
import { toast } from "sonner";
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
  layoutScope?: string;
  clientProfile?: ClientProfile | null;
};

// Bento Grid sizes based on index
const getSpanClasses = (index: number) => {
  if (index === 0) return "col-span-1 md:col-span-2 row-span-1 md:row-span-2"; // Hero card
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

export function ProductCard({ product, highlighted, isRecommended, index, layoutScope = "main", clientProfile }: Props) {
  const { add } = useCart();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [localReason, setLocalReason] = useState(product.reason || "");
  const [loadingReason, setLoadingReason] = useState(false);
  const [actionResult, setActionResult] = useState<ProductActionResult | null>(null);
  const [loadingAction, setLoadingAction] = useState<ProductAction | null>(null);
  const trackedView = useRef(false);
  const spanClasses = getSpanClasses(index);
  const isOutOfStock = Number(product.stock ?? 1) <= 0;

  const sources = (product.rag_source || product.source || "")
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error("Este producto está sin stock.");
      return;
    }
    add(product);
    trackQuestionEvent({
      event_type: "cart_add",
      question: product.query || "",
      source: "product_card",
      product_ids: [product.id],
    });
    toast.success(`${product.name} agregado al carrito.`);
  };

  const handleProductAction = async (action: ProductAction) => {
    if (!product.query && action !== "why_this") return;
    setLoadingAction(action);
    try {
      if (action === "why_this") {
        const reason = localReason || await fetchProductReason(product.query || "", product);
        setLocalReason(reason);
        setActionResult({
          action,
          title: "Por qué este",
          seller_note: reason,
          customer_phrase: "Te lo propongo porque encaja con lo que me contaste.",
          usage_tip: "Confirma tolerancia y momento de uso antes de cerrar la venta.",
        });
      } else {
        const result = await fetchProductAction(product.query || "", product, action, clientProfile || {});
        setActionResult(result);
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudo preparar esa acción de venta.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Sync localReason if product.reason changes from parent (e.g., loaded by chat or cleared)
  useEffect(() => {
    setLocalReason(product.reason || "");
  }, [product.reason]);

  useEffect(() => {
    if (!detailsOpen || trackedView.current) return;
    trackedView.current = true;
    trackQuestionEvent({
      event_type: "product_view",
      question: product.query || "",
      source: "product_detail",
      product_ids: [product.id],
    });
  }, [detailsOpen, product.id, product.query]);

  return (
    <>
      <motion.div
        layout
        layoutId={`product-${layoutScope}-${product.id}`}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        tabIndex={0}
        role="button"
        aria-label={`Ver detalles de ${product.name} de ${product.brand}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailsOpen(true);
          }
        }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 20,
          delay: index * 0.05, // Staggered orchestration
        }}
        className={`w-full flex flex-col group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 rounded-[2.5rem] ${spanClasses}`}
        onClick={() => setDetailsOpen(true)}
      >
        <motion.div
          whileHover={{ scale: 0.98, y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`relative flex-1 flex flex-col p-2 rounded-[2.5rem] ${
            highlighted ? "glass-panel" : "glass-card"
          }`}
        >
          <div className="bg-secondary rounded-[2rem] overflow-hidden w-full flex-1 min-h-[240px] relative">
            <img
              src={getProductImage(product)}
              alt={product.name}
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
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

          {/* Numbered badge — always visible for recommended products, clickable to open modal */}
          {isRecommended && product.product_index != null && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDetailsOpen(true);
              }}
              aria-label={`Ver detalles de recomendación para ${product.name} (producto ${product.product_index})`}
              title="Ver por qué Lumi lo recomendó"
              className="absolute top-6 left-6 size-9 bg-foreground/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-sm hover:bg-foreground hover:scale-110 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
            >
              <span className="text-background text-[13px] font-bold tabular-nums">
                {product.product_index}
              </span>
            </button>
          )}

        </motion.div>

        {/* Info rendered outside the card for clean gallery presentation */}
        <div className="pt-4 px-2 flex flex-col gap-1.5">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h3 className="text-product-name line-clamp-2">{product.name}</h3>
              <p className="text-[12px] font-medium text-muted-foreground/80">{product.brand}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <p className="text-price">{formatCLP(product.price)}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart();
                }}
                disabled={isOutOfStock}
                className="icon-orb size-8 rounded-full hover:bg-foreground hover:text-background transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background/55 disabled:hover:text-foreground"
                title={isOutOfStock ? "Sin stock" : "Añadir al carrito"}
                aria-label={isOutOfStock ? `${product.name} sin stock` : `Añadir ${product.name} al carrito`}
              >
                <Plus weight="bold" className="size-4" />
              </button>
            </div>
          </div>
          
          {localReason && (
            <p className="text-[13px] text-muted-foreground/90 mt-1 leading-relaxed line-clamp-2 italic">
              "{localReason}"
            </p>
          )}

          {(product.skin_types || product.score || product.category) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {product.score != null && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase tracking-tight animate-fade-in flex items-center gap-1">
                  <Sparkle weight="fill" className="size-2.5" />
                  {getCalibratedScore(Number(product.score))}% Match
                </span>
              )}
              {product.category && (
                <span className="px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/70 border border-foreground/10 text-[10px] font-bold uppercase tracking-tight">
                  {product.category.replace("_", " ")}
                </span>
              )}
              {product.skin_types?.slice(0, 2).map((st) => (
                <span key={st} className="px-2 py-0.5 rounded-full bg-secondary/80 text-muted-foreground text-[10px] font-bold uppercase tracking-tight">
                  {st}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="product-dialog-content p-2 md:p-2.5 overflow-hidden border border-white/20 shadow-glass-lg glass-panel bg-background/80 overflow-y-auto scrollbar-hide m-0 [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-background/85 [&>button]:backdrop-blur-xl [&>button]:border [&>button]:border-foreground/10 [&>button]:size-9 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:shadow-sm">
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
                    (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-background/20 pointer-events-none" />

                {isRecommended && product.score != null && (
                  <div className="absolute top-4 left-4 px-3.5 py-1.5 bg-emerald-500/90 text-white backdrop-blur-xl rounded-full text-[10px] uppercase tracking-wider font-bold shadow-lg flex items-center gap-1.5 animate-fade-in border border-white/20">
                    <Sparkle weight="fill" className="size-3.5" />
                    Match: {getCalibratedScore(Number(product.score))}%
                  </div>
                )}
                {isRecommended && product.product_index != null && (
                  <div className="absolute top-4 right-4 size-8 bg-background/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-sm border border-white/20">
                    <span className="text-foreground text-[12px] font-bold tabular-nums">{product.product_index}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Section: Details */}
            <div className="col-span-1 md:col-span-7 p-5 md:p-8 flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-5">
                {/* Brand & Category */}
                <div>
                  <p className="text-eyebrow mb-1.5">{product.brand}</p>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground leading-tight">{product.name}</h3>
                </div>

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
                        {b}
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

                {/* RAG Recommendation Details — enriched with rag_source */}
                {isRecommended && (localReason || loadingReason) && (
                  <div className="p-4 rounded-[1.25rem] bg-emerald-500/[0.03] border border-emerald-500/10 backdrop-blur-md flex flex-col gap-3 animate-fade-in mt-1">
                    {/* Header row */}
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-500 text-[12px] font-bold">
                      <Sparkle weight="light" className="size-4 shrink-0" />
                      <span>¿Por qué Lumi lo recomendó?</span>
                    </div>

                    {/* Reason text or loading */}
                    {loadingReason ? (
                      <div className="flex items-center gap-2 text-[13px] text-muted-foreground font-medium py-2">
                        <CircleNotch weight="light" className="size-4 animate-spin" />
                        <span>Lumi está descubriendo por qué es ideal para ti...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-[13px] text-foreground/80 font-medium leading-relaxed">
                          {localReason}
                        </p>

                        {/* Source provenance row */}
                        {sources.length > 0 && (
                          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-emerald-500/10">
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-500 font-semibold uppercase tracking-wider">
                              <BookOpen weight="light" className="size-3.5 text-emerald-600 shrink-0" />
                              <span>Fuente{sources.length > 1 ? "s" : ""}:</span>
                            </div>
                            <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide py-0.5 mt-0.5 -mx-1 px-1 max-w-full">
                              {sources.map((src, i) => (
                                <span
                                  key={i}
                                  className="inline-flex shrink-0 items-center rounded-md border border-emerald-500/15 bg-emerald-500/[0.05] px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 capitalize max-w-[150px] truncate"
                                  title={src}
                                >
                                  {src}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {isRecommended && (
                  <div className="rounded-[1.25rem] bg-foreground/[0.025] border border-foreground/8 p-3.5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground">Acciones de venta</p>
                      {loadingAction && <CircleNotch weight="light" className="size-4 animate-spin text-muted-foreground" />}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["why_this", "Por qué este"],
                        ["cheaper", "Más barato"],
                        ["premium", "Premium"],
                      ].map(([action, label]) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => handleProductAction(action as ProductAction)}
                          disabled={Boolean(loadingAction)}
                          className="rounded-full border border-foreground/10 bg-background/70 px-3 py-1.5 text-[11px] font-bold text-foreground/75 hover:text-foreground hover:bg-background transition disabled:opacity-50"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {actionResult && (
                      <div className="rounded-[1rem] bg-background/70 border border-foreground/8 p-3 text-[12px] leading-relaxed">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-bold text-foreground">{actionResult.title}</p>
                          {actionResult.product && (
                            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              {formatCLP(actionResult.product.price)}
                            </span>
                          )}
                        </div>
                        {actionResult.product && (
                          <p className="mt-1 font-semibold text-foreground/80">{actionResult.product.name}</p>
                        )}
                        <p className="mt-2 text-foreground/75">{actionResult.seller_note}</p>
                        <p className="mt-2 text-muted-foreground">{actionResult.customer_phrase}</p>
                        <p className="mt-1 text-muted-foreground">{actionResult.usage_tip}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer / Add to Cart (Premium Button-in-Button structure) */}
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-4">
                <div className="flex justify-between items-center gap-4">
                  <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{formatCLP(product.price)}</p>

                  {isRecommended && (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 animate-fade-in">
                      <Sparkle weight="light" className="size-3" /> Recomendado por Lumi
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart();
                    setDetailsOpen(false);
                  }}
                  disabled={isOutOfStock}
                  className="group relative w-full bg-foreground text-background rounded-full py-2.5 pl-6 pr-2.5 text-cta hover:opacity-95 active:scale-[0.98] transition-all duration-300 flex items-center justify-between gap-4 font-bold border border-foreground/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  <span>{isOutOfStock ? "Sin stock disponible" : "Añadir al carrito"}</span>
                  <div className="w-9 h-9 rounded-full bg-background/18 text-background flex items-center justify-center group-hover:scale-105 transition-transform shadow-md border border-background/15">
                    <Plus weight="bold" className="size-5" />
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
