import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { ArrowRight, ShoppingBag, X, Trash, Plus, Minus, Receipt, Sparkle } from "@phosphor-icons/react";
import { formatCLP } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import { ReceiptModal } from "./ReceiptModal";
import { FALLBACK_IMAGE_URL, getProductImage } from "@/lib/images";

export function CartDrawer() {
  const { items, add, decrement, remove, clear, total, count } = useCart();
  const [open, setOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const checkout = () => {
    setReceiptOpen(true);
    setOpen(false);
  };


  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Carrito (${count} productos)`}
        className="fixed bottom-5 right-5 z-50 glass-panel rounded-full p-1.5 pl-4 flex items-center gap-3 shadow-glass-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group"
      >
        <span className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-bold text-muted-foreground tracking-[0.12em] uppercase">Carrito</span>
          <span className="mt-1 text-[12px] font-bold text-foreground tabular-nums">
            {count > 0 ? formatCLP(total) : "Vacío"}
          </span>
        </span>
        <div className="relative size-10 rounded-full bg-foreground text-background flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
          <ShoppingBag weight="light" className="size-5 text-background" />
          <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-background text-foreground border border-foreground/10 px-1 flex items-center justify-center text-[10px] font-bold tabular-nums shadow-sm">
            {count}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            {/* Backdrop con desvanecimiento */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0 bg-foreground/15 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Sidebar deslizante con resorte premium */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full sm:max-w-[460px] h-full glass-panel sm:rounded-l-[2.5rem] p-5 sm:p-7 flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-start gap-4 mb-6">
                <div>
                  <p className="text-eyebrow mb-2">Recepción</p>
                  <h2 className="text-title">Carrito Lumi</h2>
                  <p className="mt-1 text-[12px] font-medium text-muted-foreground">
                    {count > 0 ? `${count} producto${count !== 1 ? "s" : ""} listos para ticket` : "Sin productos seleccionados"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar carrito"
                  className="size-10 rounded-full bg-background/70 border border-foreground/10 flex items-center justify-center hover:bg-background transition shadow-sm"
                >
                  <X weight="light" className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-4">
                {items.length === 0 ? (
                  <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center rounded-[2rem] border border-dashed border-foreground/12 bg-background/35 px-8">
                    <div className="size-14 rounded-[1.35rem] bg-foreground text-background flex items-center justify-center shadow-md mb-5">
                      <ShoppingBag weight="light" className="size-7" />
                    </div>
                    <h3 className="text-[16px] font-bold tracking-tight text-foreground">Todavía no hay selección</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground max-w-[260px]">
                      Agrega productos desde el catálogo o desde una recomendación para generar el ticket.
                    </p>
                  </div>
                ) : (
                  items.map((i) => (
                    <motion.div
                      layout
                      key={i.product.id}
                      className="flex gap-4 glass-card rounded-[1.75rem] p-3.5 border border-foreground/5"
                    >
                      <img
                        src={getProductImage(i.product)}
                        alt={i.product.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                        }}
                        className="size-20 rounded-[1.15rem] object-cover border border-foreground/5"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="text-[13px] font-bold leading-snug text-foreground line-clamp-2">{i.product.name}</p>
                          <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-muted-foreground mt-1">{i.product.brand}</p>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center bg-background/70 rounded-full p-1 border border-foreground/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                            <button
                              type="button"
                              onClick={() => decrement(i.product.id)}
                              aria-label={`Restar ${i.product.name}`}
                              className="size-7 rounded-full flex items-center justify-center hover:bg-secondary transition"
                            >
                              <Minus weight="bold" className="size-3" />
                            </button>
                            <span className="w-8 text-center text-[13px] font-bold tabular-nums">{i.qty}</span>
                            <button
                              type="button"
                              onClick={() => add(i.product)}
                              aria-label={`Sumar ${i.product.name}`}
                              className="size-7 rounded-full flex items-center justify-center hover:bg-secondary transition"
                            >
                              <Plus weight="bold" className="size-3" />
                            </button>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => remove(i.product.id)}
                            aria-label={`Eliminar ${i.product.name}`}
                            className="size-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/5 flex items-center justify-center transition-colors"
                          >
                            <Trash weight="light" className="size-5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-between shrink-0">
                        <span className="text-[11px] text-muted-foreground tabular-nums">{formatCLP(i.product.price)}</span>
                        <p className="text-[14px] font-bold tabular-nums text-foreground">{formatCLP(i.product.price * i.qty)}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="mt-6 pt-5 border-t border-border/70">
                  <div className="rounded-[1.75rem] bg-background/50 border border-foreground/8 p-4 mb-4">
                    <div className="flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                      <span>Productos</span>
                      <span className="tabular-nums">{count}</span>
                    </div>
                    <div className="flex justify-between items-end mt-3">
                      <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Total</span>
                      <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{formatCLP(total)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={checkout}
                    className="w-full bg-foreground text-background rounded-full py-3 pl-5 pr-2.5 text-cta hover:opacity-95 active:scale-[0.98] transition flex items-center justify-between gap-3 shadow-lg"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Receipt weight="light" className="size-5" />
                      Generar ticket
                    </span>
                    <span className="size-9 rounded-full bg-background/18 border border-background/15 flex items-center justify-center">
                      <ArrowRight weight="bold" className="size-4" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={clear}
                    className="mt-3 w-full text-[12px] font-bold text-muted-foreground hover:text-foreground transition inline-flex items-center justify-center gap-1.5"
                  >
                    <Sparkle weight="light" className="size-3.5" />
                    Vaciar selección
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ReceiptModal isOpen={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </>
  );
}
