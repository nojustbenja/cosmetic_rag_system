import { ClientProfile, Product } from "@/types/shop";
import { ProductCard } from "./ProductCard";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useEffect, useRef, useState } from "react";

// Cuántas cards se montan inicialmente y por cada "página" en el catálogo.
// Mantiene el DOM liviano cuando el catálogo crece (evita montar 48 cards de golpe).
const PAGE_SIZE = 12;

type Props = {
  products: Product[];
  recIds: string[];
  layoutScope?: string;
  clientProfile?: ClientProfile | null;
};

function ProductStageInner({ products, recIds, layoutScope = "main", clientProfile }: Props) {
  // If recommendations exist, show them first ordered by product_index; otherwise show all
  const visible = recIds.length
    ? recIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p))
        .sort((a, b) => (a.product_index ?? 99) - (b.product_index ?? 99))
    : products;

  const isRecMode = recIds.length > 0;

  // Revelado incremental: en modo catálogo solo montamos un lote y vamos
  // sumando más a medida que el usuario se acerca al final (lazy load por scroll).
  // En modo recomendación son pocas piezas, así que se muestran todas.
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reinicia el límite cuando cambia el conjunto visible (nueva búsqueda/catálogo).
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [isRecMode, visible.length]);

  const hasMore = !isRecMode && limit < visible.length;

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLimit((prev) => prev + PAGE_SIZE);
        }
      },
      { rootMargin: "600px 0px" } // precarga antes de llegar al borde
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  const rendered = isRecMode ? visible : visible.slice(0, limit);

  return (
    <div className="w-full p-6 lg:p-12">
      <AnimatePresence mode="popLayout">
        {isRecMode && (
          <motion.div
            key="rec-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-16 max-w-3xl"
          >
            <p className="text-eyebrow mb-4">Curado para ti</p>
            <h2 className="text-display">
              Lumi ha materializado{" "}
              <span className="text-muted-foreground">{visible.length} pieza{visible.length !== 1 ? "s" : ""}</span> según tu conversación.
            </h2>
          </motion.div>
        )}
        {!isRecMode && (
          <motion.div
            key="catalog-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-16 max-w-3xl"
          >
            <p className="text-eyebrow mb-4">Catálogo</p>
            <h2 className="text-display">
              Conversa con Lumi para descubrir lo que <span className="text-muted-foreground">realmente necesitas.</span>
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-[minmax(350px,auto)] grid-flow-dense gap-8 w-full"
      >
        <AnimatePresence mode="sync">
          {rendered.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              highlighted={isRecMode && i === 0}
              isRecommended={recIds.includes(p.id)}
              index={i}
              layoutScope={layoutScope}
              clientProfile={clientProfile}
            />
          ))}
        </AnimatePresence>
      </div>

      {hasMore && (
        <div
          ref={sentinelRef}
          aria-hidden
          className="h-12 w-full flex items-center justify-center mt-8 text-[11px] uppercase tracking-[0.15em] text-muted-foreground/60"
        >
          Cargando más…
        </div>
      )}
    </div>
  );
}

export const ProductStage = memo(ProductStageInner);
