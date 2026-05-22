import { Product } from "@/types/shop";
import { ProductCard } from "./ProductCard";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  products: Product[];
  recIds: string[];
};

export function ProductStage({ products, recIds }: Props) {
  // If recommendations exist, show them first ordered by product_index; otherwise show all
  const visible = recIds.length
    ? recIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p))
        .sort((a, b) => (a.product_index ?? 99) - (b.product_index ?? 99))
    : products;

  const isRecMode = recIds.length > 0;

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

      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-[minmax(350px,auto)] grid-flow-dense gap-8 w-full"
      >
        <AnimatePresence mode="popLayout">
          {visible.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              highlighted={isRecMode && i === 0}
              isRecommended={recIds.includes(p.id)}
              index={i}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
