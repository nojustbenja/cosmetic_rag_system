import { Product } from "@/types/shop";

export const FALLBACK_IMAGE_URL =
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80";

export function getProductImage(product: Product): string {
  if (product.image_url && product.image_url.startsWith('http')) {
    return product.image_url;
  }
  
  const name = (product.name || "").toLowerCase();
  
  if (name.includes("serum") || name.includes("concentrado") || name.includes("b5") || name.includes("niacinamida")) {
    return "https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("agua micelar") || name.includes("micelar") || name.includes("effaclar") || name.includes("limpiador") || name.includes("limpieza")) {
    return "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("protector solar") || name.includes("anthelios") || name.includes("oil control") || name.includes("fusion water")) {
    return "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("labial") || name.includes("balsamo labial") || name.includes("labios")) {
    return "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("crema") || name.includes("hydra") || name.includes("revitalift") || name.includes("hidratante") || name.includes("q10")) {
    return "https://images.unsplash.com/photo-1601049676099-e7ed07d825b0?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("mascarilla") || name.includes("arcilla") || name.includes("exfoliante")) {
    return "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80";
  }
  
  // Fallback por categoría
  const cat = (product.category || "").toLowerCase();
  if (cat.includes("facial") || cat.includes("skincare")) {
    return "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80";
  }
  if (cat.includes("limpieza")) {
    return "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=600&q=80";
  }
  if (cat.includes("solar")) {
    return "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&q=80";
  }
  if (cat.includes("maquillaje") || cat.includes("makeup")) {
    return "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80";
  }
  if (cat.includes("corporal") || cat.includes("cuerpo") || cat.includes("body")) {
    return "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=600&q=80";
  }
  
  return FALLBACK_IMAGE_URL;
}
