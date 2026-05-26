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

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recIds?: string[];
  products?: Product[];
};

export type CartItem = { product: Product; qty: number };

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

