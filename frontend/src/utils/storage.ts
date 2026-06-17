import { ChatSession } from "@/types/shop";

const STORAGE_KEY = "lumi_chat_history";
const MAX_SESSIONS = 20;

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

export function saveSession(session: ChatSession): void {
  try {
    const existing = loadSessions();
    const filtered = existing.filter((s) => s.id !== session.id);
    const updated = [session, ...filtered].slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn("No se pudo guardar la sesión en localStorage.");
  }
}

export function deleteSession(sessionId: string): void {
  try {
    const existing = loadSessions();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(existing.filter((s) => s.id !== sessionId))
    );
  } catch {
    console.warn("No se pudo eliminar la sesión del historial.");
  }
}

export function clearAllSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn("No se pudo limpiar el historial.");
  }
}
