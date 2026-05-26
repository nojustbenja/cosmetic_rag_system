import { useEffect, useState, useCallback, useRef } from "react";
import { ClientProfile, Product } from "@/types/shop";
import { ChatPanel } from "@/components/ChatPanel";
import { ProductStage } from "@/components/ProductStage";
import { CartDrawer } from "@/components/CartDrawer";
import { MobileRecsSheet } from "@/components/MobileRecsSheet";
import { CartProvider } from "@/hooks/useCart";
import { useProfile } from "@/hooks/useProfile";
import { fetchProducts } from "@/lib/api";
import { toast } from "sonner";

const stripRagFields = (product: Product): Product => {
  const clean = { ...product };
  delete clean.score;
  delete clean.reason;
  delete clean.rag_source;
  delete clean.product_index;
  return clean;
};

const Index = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recIds, setRecIds] = useState<string[]>([]);
  const [guides, setGuides] = useState<unknown[]>([]);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const { profile } = useProfile();

  const loadCatalog = useCallback(() => {
    fetchProducts()
      .then((data) => {
        setAllProducts(data);
        setProducts(data);
      })
      .catch((err) => {
        console.error("Error al cargar catálogo:", err);
        toast.error("No se pudo conectar con el catálogo. Asegúrate de que el backend esté corriendo.");
      });
  }, []);

  useEffect(() => {
    document.title = "Lumi · Asesora de cosmética con IA";
    const desc =
      "Lumi, asesora digital con IA especializada en cosmética: skincare, maquillaje, fragancias y cabello. Recomendaciones personalizadas según tu piel y estilo. 24/7.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }

    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const main = mainRef.current;
    const canTrackPointer = window.matchMedia("(pointer: fine) and (min-width: 900px)").matches;
    if (!main || !canTrackPointer) return;

    let frameId = 0;
    const handlePointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const x = event.clientX;
        const y = event.clientY;
        const shiftX = (x / window.innerWidth - 0.5) * 24;
        const shiftY = (y / window.innerHeight - 0.5) * 18;
        main.style.setProperty("--lumi-x", `${x}px`);
        main.style.setProperty("--lumi-y", `${y}px`);
        main.style.setProperty("--lumi-shift-x", `${shiftX}px`);
        main.style.setProperty("--lumi-shift-y", `${shiftY}px`);
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  /** Called by ChatPanel when user clicks "Nueva consulta". */
  const handleClearChat = useCallback(() => {
    // Remove recommendation overlays and restore the full clean catalog
    setRecIds([]);
    setGuides([]);
    setClientProfile(null);
    // Strip RAG-specific overlaid fields so cards render as catalog items.
    setProducts(allProducts.map(stripRagFields));
  }, [allProducts]);

  return (
    <CartProvider>
      <CartDrawer />
      <main ref={mainRef} className="min-h-[100dvh] w-full relative overflow-x-clip bg-background ambient-bg">
        {/* Grain overlay for haptic paper/matte texture */}
        <div 
          className="fixed inset-0 pointer-events-none z-[100] opacity-[0.01] md:opacity-[0.015] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
        <MobileRecsSheet products={products} recIds={recIds} clientProfile={clientProfile} />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[420px_1fr] min-h-[100dvh] w-full max-w-[1600px] mx-auto p-4 pt-8 sm:pt-10 lg:p-6 gap-6">
          <ChatPanel
            onClearChat={handleClearChat}
            clientProfile={clientProfile}
            onProfile={setClientProfile}
            onRecommendations={(recProducts, newGuides) => {
              // Merge recommended products (with scores/reasons) into current catalog state
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

          {/* Desktop & Mobile: product panel now adapts beautifully, showing below on mobile */}
          <section className="w-full lg:flex-1 min-h-[50dvh] lg:min-h-[100dvh] rounded-[2.5rem] glass-panel catalog-shell mt-6 lg:mt-0">
            <h2 className="sr-only">Productos recomendados por Lumi</h2>
            <ProductStage products={products} recIds={recIds} clientProfile={clientProfile} />
          </section>
        </div>
      </main>
    </CartProvider>
  );
};

export default Index;
