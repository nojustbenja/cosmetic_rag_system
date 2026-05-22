import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { ShoppingBag, X, Trash2 } from "lucide-react";
import { formatCLP } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import { ReceiptModal } from "./ReceiptModal";
import { FALLBACK_IMAGE_URL, getProductImage } from "@/lib/images";

export function CartDrawer() {
  const { items, remove, clear, total, count } = useCart();
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
        className="fixed top-6 right-6 z-50 glass-panel rounded-full px-5 py-3 flex items-center gap-2.5 hover:scale-105 transition-transform"
      >
        <ShoppingBag className="size-4 text-foreground" />
        <span className="text-cta text-foreground tabular-nums">{count}</span>
        {count > 0 && (
          <span className="text-cta text-muted-foreground tabular-nums border-l border-border pl-2.5">
            {formatCLP(total)}
          </span>
        )}
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
              className="relative w-full max-w-md h-full glass-panel rounded-l-[2.5rem] p-8 flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-title">Tu carrito</h2>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar carrito"
                  className="size-9 rounded-full bg-secondary flex items-center justify-center hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-4">
                {items.length === 0 ? (
                  <p className="text-body text-muted-foreground">
                    Tu carrito está vacío. Conversa con Lumi para descubrir productos.
                  </p>
                ) : (
                  items.map((i) => (
                    <motion.div
                      layout
                      key={i.product.id}
                      className="flex gap-3 glass-card rounded-2xl p-3"
                    >
                      <img
                        src={getProductImage(i.product)}
                        alt={i.product.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                        }}
                        className="size-16 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-label truncate">{i.product.name}</p>
                        <p className="text-meta tabular-nums">
                          {i.qty} × {formatCLP(i.product.price)}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(i.product.id)}
                        aria-label="Eliminar"
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex justify-between mb-4">
                    <span className="text-meta">Total</span>
                    <span className="text-price">{formatCLP(total)}</span>
                  </div>
                  <button
                    onClick={checkout}
                    className="w-full bg-foreground text-background rounded-full py-4 text-cta hover:opacity-90 transition"
                  >
                    Generar Ticket de Recepción
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
