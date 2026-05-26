import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import type { CartItem, Product } from "@/types/shop";

type CartCtx = {
  items: CartItem[];
  add: (p: Product) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  total: number;
  count: number;
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

  return <Ctx.Provider value={{ items, add, decrement, remove, clear, total, count }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
