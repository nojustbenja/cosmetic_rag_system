import { Product } from "@/types/shop";

const API_URL = 'http://127.0.0.1:8000/chat';

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
  onContext?: (context: any) => void;
  onToken?: (token: string) => void;
};

export async function streamChat(message: string, sessionId: string, handlers: StreamHandlers) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId })
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
  const url = API_URL.replace('/chat', '/products');
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('No se pudo obtener el catálogo de productos.');
  }
  return response.json();
}

export async function createOrder(order: any): Promise<any> {
  const url = API_URL.replace('/chat', '/orders');
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

export async function fetchOrders(): Promise<any[]> {
  const url = API_URL.replace('/chat', '/orders');
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('No se pudieron obtener las órdenes.');
  }
  return response.json();
}

export async function createProduct(product: any): Promise<any> {
  const url = API_URL.replace('/chat', '/products');
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

export async function importProductsCsv(csvContent: string, mode: string): Promise<any> {
  const url = API_URL.replace('/chat', '/products/import-csv');
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

export async function getAiAssistedProduct(name: string, brand: string): Promise<any> {
  const url = API_URL.replace('/chat', '/products/ai-assist');
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

export async function updateOrderStatus(ticketNumber: string, status: string): Promise<any> {
  const url = API_URL.replace('/chat', `/orders/${ticketNumber}/status`);
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


