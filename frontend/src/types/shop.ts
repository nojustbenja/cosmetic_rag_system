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
  skin_types?: string[];
  benefits?: string[];
  source?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  recIds?: string[];
};

export type CartItem = { product: Product; qty: number };
