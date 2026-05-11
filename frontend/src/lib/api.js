const API_URL = 'http://127.0.0.1:8000/chat';

function parseSseFrame(frame) {
  let event = 'message';
  const dataLines = [];

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

export async function streamChat(message, sessionId, handlers) {
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

  const dispatchFrame = (frame) => {
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
