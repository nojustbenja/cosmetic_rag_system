export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  description: string;
  image_url: string;
  stock: number;
  tags: string[];
  // RAG Specific fields
  score?: number;
  reason?: string;
  query?: string;
  rag_source?: string;
  skin_types?: string[];
  benefits?: string[];
  ingredients?: string;
  source?: string;
  product_index?: number;
};

export type ClientProfile = {
  skin_type?: string;
  concern?: string;
  category?: string;
  budget_max?: number;
  usage_moment?: string;
  sensitivity?: boolean;
  fragrance_family?: string;
  confidence?: number;
  missing_fields?: string[];
};

export type ProductAction = "why_this" | "cheaper" | "premium";

export type ProductActionResult = {
  action: ProductAction;
  title: string;
  product?: Product | null;
  seller_note: string;
  customer_phrase: string;
  usage_tip: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recIds?: string[];
  products?: Product[];
};

export type CartItem = { product: Product; qty: number };

export type CartInsight = {
  tone: "info" | "warning" | "success";
  title: string;
  body: string;
};

export type CartSummary = {
  categories: string[];
  brands: string[];
  recommendedCount: number;
  insights: CartInsight[];
};

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  brand: string;
}

export interface Order {
  ticket_number: string;
  timestamp: string;
  client_name: string;
  skin_type: string;
  items: OrderItem[];
  total: number;
  status: "pendiente" | "pagado";
}
