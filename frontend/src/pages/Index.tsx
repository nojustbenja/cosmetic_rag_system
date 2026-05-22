import { useEffect, useState } from "react";
import { Product } from "@/types/shop";
import { ChatPanel } from "@/components/ChatPanel";
import { ProductStage } from "@/components/ProductStage";
import { CartDrawer } from "@/components/CartDrawer";
import { MobileRecsSheet } from "@/components/MobileRecsSheet";
import { CartProvider } from "@/hooks/useCart";
import { useProfile } from "@/hooks/useProfile";
import { fetchProducts } from "@/lib/api";
import { toast } from "sonner";

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [recIds, setRecIds] = useState<string[]>([]);
  const [guides, setGuides] = useState<any[]>([]);
  const { profile } = useProfile();

  useEffect(() => {
    document.title = "Lumi · Asesora de cosmética con IA";
    const desc = "Lumi, asesora digital con IA especializada en cosmética: skincare, maquillaje, fragancias y cabello. Recomendaciones personalizadas según tu piel y estilo. 24/7.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }

    // Cargar catálogo inicial de productos
    fetchProducts()
      .then((data) => {
        setProducts(data);
      })
      .catch((err) => {
        console.error("Error al cargar catálogo:", err);
        toast.error("No se pudo conectar con el catálogo. Asegúrate de que el backend esté corriendo.");
      });
  }, []);

  return (
    <CartProvider>
      <main className="min-h-[100dvh] w-full relative overflow-x-hidden bg-background ambient-bg">
        <CartDrawer />
        <MobileRecsSheet products={products} recIds={recIds} />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[420px_1fr] min-h-[100dvh] w-full max-w-[1600px] mx-auto p-4 lg:p-6 gap-6">
          <ChatPanel 
            onRecommendations={(recProducts, newGuides) => {
              // Fusionar productos recomendados en el estado para actualizar score/reason
              setProducts((prev) => {
                const merged = [...prev];
                recProducts.forEach((rp) => {
                  const idx = merged.findIndex((p) => p.id === rp.id);
                  if (idx === -1) {
                    merged.push(rp);
                  } else {
                    merged[idx] = { ...merged[idx], ...rp };
                  }
                });
                return merged;
              });
              setRecIds(recProducts.map((p) => p.id));
              setGuides(newGuides);
            }} 
          />

          {/* Desktop: panel siempre visible al lado */}
          <section className="hidden lg:block flex-1 min-h-[100dvh] rounded-[2.5rem] glass-panel">
            <h2 className="sr-only">Productos recomendados por Lumi</h2>
            <ProductStage products={products} recIds={recIds} />
          </section>
        </div>
      </main>
    </CartProvider>
  );
};

export default Index;
