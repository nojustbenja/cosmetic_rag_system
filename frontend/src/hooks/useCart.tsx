import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import type { CartInsight, CartItem, CartSummary, Product } from "@/types/shop";

type CartCtx = {
  items: CartItem[];
  add: (p: Product) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  total: number;
  count: number;
  summary: CartSummary;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = (p: Product) =>
    setItems((prev) => {
      const found = prev.find((i) => i.product.id === p.id);
      if (found) return prev.map((i) => (i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { product: p, qty: 1 }];
    });

  const decrement = (id: string) =>
    setItems((prev) => {
      const found = prev.find((i) => i.product.id === id);
      if (found && found.qty > 1) {
        return prev.map((i) => (i.product.id === id ? { ...i, qty: i.qty - 1 } : i));
      }
      return prev.filter((i) => i.product.id !== id);
    });

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.product.id !== id));
  const clear = () => setItems([]);

  const total = useMemo(() => items.reduce((s, i) => s + i.product.price * i.qty, 0), [items]);
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const summary = useMemo(() => buildCartSummary(items), [items]);

  return <Ctx.Provider value={{ items, add, decrement, remove, clear, total, count, summary }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

function buildCartSummary(items: CartItem[]): CartSummary {
  const categories = Array.from(new Set(items.map((item) => item.product.category).filter(Boolean)));
  const brands = Array.from(new Set(items.map((item) => item.product.brand).filter(Boolean)));
  const recommendedCount = items.filter((item) => item.product.score != null || item.product.product_index != null).length;
  const insights: CartInsight[] = [];

  const hasFacial = categories.some((category) => category.includes("facial") || category.includes("limpieza"));
  const hasSolar = categories.some((category) => category.includes("solar"));
  const cleansingCount = items.filter((item) => item.product.category?.includes("limpieza")).reduce((sum, item) => sum + item.qty, 0);
  const outOfStock = items.filter((item) => Number(item.product.stock ?? 1) <= 0);
  const sensitiveActives = items.filter((item) => {
    const haystack = [
      item.product.name,
      item.product.description,
      item.product.ingredients,
      ...(item.product.tags || []),
      ...(item.product.benefits || []),
    ].join(" ").toLowerCase();
    return haystack.includes("retinol") || haystack.includes("ácido") || haystack.includes("acido") || haystack.includes("exfol");
  });

  if (items.length === 0) {
    return { categories, brands, recommendedCount, insights };
  }
  if (hasFacial && !hasSolar) {
    insights.push({
      tone: "warning",
      title: "Falta protección solar",
      body: "Si esta venta será rutina de día, sugiere sumar SPF para cerrar mejor la recomendación.",
    });
  }
  if (cleansingCount > 1) {
    insights.push({
      tone: "info",
      title: "Paso duplicado",
      body: "Hay más de un limpiador. Confirma si busca alternativa o doble limpieza.",
    });
  }
  if (outOfStock.length > 0) {
    insights.push({
      tone: "warning",
      title: "Revisar stock",
      body: `${outOfStock[0].product.name} aparece sin stock disponible.`,
    });
  }
  if (sensitiveActives.length > 0) {
    insights.push({
      tone: "info",
      title: "Uso gradual",
      body: "Hay activos potencialmente intensos. Para piel sensible, recomienda partir con baja frecuencia.",
    });
  }
  if (recommendedCount > 0) {
    insights.push({
      tone: "success",
      title: "Venta guiada por Lumi",
      body: `${recommendedCount} producto${recommendedCount !== 1 ? "s" : ""} vienen de una recomendación conversacional.`,
    });
  }

  return { categories, brands, recommendedCount, insights: insights.slice(0, 4) };
}
