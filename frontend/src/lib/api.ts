import { ClientProfile, Product, ProductAction, ProductActionResult, Order } from "@/types/shop";

const API_URL = 'http://localhost:8000/chat';

const endpoint = (path: string) => API_URL.replace('/chat', path);

export type ProviderOption = {
  id: string;
  label: string;
  default_model: string;
  default_base_url: string;
  key_field: string;
  supports_kilo_mode: boolean;
  billing_hook: string;
};

export type ProviderConfig = {
  provider: string;
  label: string;
  model: string;
  base_url: string;
  api_key_set: boolean;
  kilo_mode: string;
  providers: ProviderOption[];
  billing?: { enabled: boolean; hook: string };
};

export type ProviderConfigPayload = {
  provider: string;
  model: string;
  base_url: string;
  api_key?: string;
  kilo_mode?: string;
};

export type ProviderValidation = {
  ok: boolean;
  provider?: string;
  message: string;
};

function parseSseFrame(frame: string) {
  let event = 'message';
  const dataLines: string[] = [];

  for (const rawLine of frame.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }

  if (!dataLines.length) return null;
  return {
    event,
    data: JSON.parse(dataLines.join('\n'))
  };
}

export type StreamHandlers = {
  onContext?: (context: Record<string, unknown> | unknown[]) => void;
  onProfile?: (profile: ClientProfile) => void;
  onProduct?: (product: Product) => void;
  onContextDone?: (data: { guides: unknown[]; total: number }) => void;
  onToken?: (token: string) => void;
};

export async function streamChat(message: string, sessionId: string, handlers: StreamHandlers, signal?: AbortSignal) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
    signal
  });

  if (!response.ok || !response.body) {
    throw new Error('No se pudo conectar con el backend RAG.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatchFrame = (frame: string) => {
    const parsed = parseSseFrame(frame);
    if (!parsed) return;

    if (parsed.event === 'context') handlers.onContext?.(parsed.data);
    if (parsed.event === 'profile') handlers.onProfile?.(parsed.data);
    if (parsed.event === 'product') handlers.onProduct?.(parsed.data);
    if (parsed.event === 'context_done') handlers.onContextDone?.(parsed.data);
    if (parsed.event === 'token' && parsed.data.token) handlers.onToken?.(parsed.data.token);
    if (parsed.event === 'error') throw new Error(parsed.data.error ?? 'Error inesperado.');
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      if (buffer.trim()) dispatchFrame(buffer);
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const normalized = buffer.replace(/\r\n/g, '\n');
    const parts = normalized.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const frame of parts) {
      dispatchFrame(frame);
    }
  }
}

export async function fetchProducts(): Promise<Product[]> {
  const url = endpoint('/products');
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('No se pudo obtener el catálogo de productos.');
  }
  return response.json();
}

export async function createOrder(order: Order): Promise<Order> {
  const url = endpoint('/orders');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  if (!response.ok) {
    throw new Error('No se pudo registrar la orden.');
  }
  return response.json();
}

export async function fetchOrders(): Promise<Order[]> {
  const url = endpoint('/orders');
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('No se pudieron obtener las órdenes.');
  }
  return response.json();
}

export async function deleteOrder(ticketNumber: string): Promise<{ success: boolean }> {
  const url = endpoint(`/orders/${ticketNumber}`);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('No se pudo eliminar el ticket.');
  }
  return response.json();
}

export async function createProduct(product: Omit<Product, "id">): Promise<Product> {
  const url = endpoint('/products');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  if (!response.ok) {
    throw new Error('No se pudo guardar el producto.');
  }
  return response.json();
}

export async function importProductsCsv(csvContent: string, mode: "merge" | "replace"): Promise<{ success: boolean; count: number }> {
  const url = endpoint('/products/import-csv');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv_content: csvContent, mode }),
  });
  if (!response.ok) {
    throw new Error('No se pudo importar el CSV.');
  }
  return response.json();
}

export async function getAiAssistedProduct(name: string, brand: string): Promise<Partial<Product>> {
  const url = endpoint('/products/ai-assist');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, brand }),
  });
  if (!response.ok) {
    throw new Error('La asistencia de IA no pudo completarse.');
  }
  return response.json();
}

export async function updateOrderStatus(ticketNumber: string, status: "pendiente" | "pagado"): Promise<{ success: boolean }> {
  const url = endpoint(`/orders/${ticketNumber}/status`);
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error('No se pudo actualizar el estado de la orden.');
  }
  return response.json();
}


export async function updateProduct(originalName: string, product: Omit<Product, "id">): Promise<Product> {
  const url = endpoint('/products');
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ original_name: originalName, ...product }),
  });
  if (!response.ok) {
    throw new Error('No se pudo actualizar el producto.');
  }
  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  const url = endpoint('/health');
  try {
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch (err) {
    console.error("Lumi Health Check Failed:", err);
    return false;
  }
}

export async function fetchProviderConfig(): Promise<ProviderConfig> {
  const response = await fetch(endpoint('/provider-config'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('No se pudo obtener la configuración del proveedor.');
  }
  return response.json();
}

export async function saveProviderConfig(payload: ProviderConfigPayload): Promise<ProviderConfig> {
  const response = await fetch(endpoint('/provider-config'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('No se pudo guardar la configuración del proveedor.');
  }
  return response.json();
}

export async function validateProviderConfig(payload: ProviderConfigPayload): Promise<ProviderValidation> {
  const response = await fetch(endpoint('/provider-config/validate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('No se pudo validar la configuración del proveedor.');
  }
  return response.json();
}

export async function fetchProductReason(message: string, product: Product): Promise<string> {
  const url = `${API_URL}/reason`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, product }),
  });
  if (!response.ok) {
    throw new Error('No se pudo obtener la razón del producto.');
  }
  const data = await response.json();
  return data.reason;
}

export async function fetchProductAction(
  message: string,
  product: Product,
  action: ProductAction,
  profile: ClientProfile,
): Promise<ProductActionResult> {
  const url = `${API_URL}/product-action`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, product, action, profile }),
  });
  if (!response.ok) {
    throw new Error('No se pudo obtener la acción de venta.');
  }
  return response.json();
}
