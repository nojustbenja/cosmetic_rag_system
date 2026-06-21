import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ChatPanel } from "@/components/ChatPanel";
import * as api from "@/lib/api";
import * as storage from "@/utils/storage";

// Mock the API and storage
vi.mock("@/lib/api", () => ({
  streamChat: vi.fn(),
  fetchQuestionSuggestions: vi.fn(),
  getQuestionSessionId: vi.fn(() => "test-session-id"),
  trackQuestionEvent: vi.fn(),
  checkHealth: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("@/utils/storage", () => ({
  loadSessions: vi.fn(() => []),
  saveSession: vi.fn(),
}));

// Mock ResizeObserver for the QuestionSuggestionRail component
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock crypto.randomUUID
if (!global.crypto) {
  Object.defineProperty(global, "crypto", {
    value: {
      randomUUID: () => "test-uuid-" + Math.random(),
    },
  });
}

// Mock scrollIntoView and scrollTo
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.scrollTo = vi.fn();

describe("ChatPanel User Flow", () => {
  const mockOnRecommendations = vi.fn();
  const mockOnClearChat = vi.fn();
  const mockOnProfile = vi.fn();
  const mockOnUpdateProductReason = vi.fn();
  const mockOnRestoreSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    vi.mocked(api.fetchQuestionSuggestions).mockResolvedValue([
      { id: "sugg-1", text: "Busco un serum antimanchas", group: "frequent", label: "Frecuentes", score: 1, is_trending: false },
      { id: "sugg-2", text: "Recomendacion de crema de dia", group: "trending", label: "Trending", score: 1, is_trending: true },
    ]);
  });

  it("should complete a normal user flow: personalization, chip question, custom question", async () => {
    const user = userEvent.setup();
    
    // 1. Render ChatPanel without a profile
    const { rerender } = render(
      <MemoryRouter>
        <ChatPanel
          onRecommendations={mockOnRecommendations}
          onClearChat={mockOnClearChat}
          onProfile={mockOnProfile}
          clientProfile={null}
        />
      </MemoryRouter>
    );

    // Assert initial welcome message
    expect(screen.getByText(/¡Hola! Soy Lumi, tu asesora de belleza./i)).toBeInTheDocument();

    // 2. Personalize profile
    // Wait for the profile form to be visible (it auto-opens when profile is null)
    expect(screen.getByText("Edad")).toBeInTheDocument();
    
    const ageInput = screen.getByLabelText(/Edad/i);
    const skinSelect = screen.getByLabelText(/Piel/i);
    const allergiesInput = screen.getByLabelText(/Condiciones médicas o alergias/i);
    const saveButton = screen.getByRole("button", { name: /Guardar Perfil/i });

    await user.type(ageInput, "30");
    await user.selectOptions(skinSelect, "mixta");
    await user.type(allergiesInput, "fragancias");
    await user.click(saveButton);

    // Check if onProfile was called with correct data
    expect(mockOnProfile).toHaveBeenCalledWith({
      age: 30,
      skin_type: "mixta",
      allergies: ["fragancias"],
      climate: undefined,
    });

    // Simulate parent updating the clientProfile prop
    rerender(
      <MemoryRouter>
        <ChatPanel
          onRecommendations={mockOnRecommendations}
          onClearChat={mockOnClearChat}
          onProfile={mockOnProfile}
          clientProfile={{
            age: 30,
            skin_type: "mixta",
            allergies: ["fragancias"],
          }}
        />
      </MemoryRouter>
    );

    // Welcome message should update according to the new profile
    await waitFor(() => {
      expect(screen.getByText(/Ya tengo configurado tu perfil \(30 años\) con piel mixta/i)).toBeInTheDocument();
    });

    // 3. Check for the chat's inline recommendation chips based on profile (e.g. "Control de brillo", "Limpieza profunda")
    await waitFor(() => {
      expect(screen.getByText("Control de brillo")).toBeInTheDocument();
    });
    
    // Click the inline chat option
    await user.click(screen.getByText("Control de brillo"));

    // Assert that streamChat is called for the chat option chip
    expect(api.streamChat).toHaveBeenCalledTimes(1);
    expect(api.streamChat).toHaveBeenCalledWith(
      "Control de brillo",
      expect.any(String),
      expect.objectContaining({ age: 30 }),
      expect.any(Array),
      expect.any(Object),
      expect.any(AbortSignal)
    );

    // 4. Ask a question using suggestion chips from the Rail
    await waitFor(() => {
      expect(screen.getByText("Recomendacion de crema de dia")).toBeInTheDocument();
    });

    const railChipButton = screen.getByText("Recomendacion de crema de dia");
    await user.click(railChipButton);

    expect(api.streamChat).toHaveBeenCalledTimes(2);
    expect(api.streamChat).toHaveBeenCalledWith(
      "Recomendacion de crema de dia",
      expect.any(String),
      expect.objectContaining({ age: 30 }),
      expect.any(Array),
      expect.any(Object),
      expect.any(AbortSignal)
    );

    // 5. Ask a custom question via typed input
    const inputArea = screen.getByPlaceholderText(/Cuéntale a Lumi sobre tu piel o qué buscas.../i);
    const sendButton = screen.getByRole("button", { name: /Enviar mensaje/i });

    await user.type(inputArea, "Busco una crema hidratante");
    await user.click(sendButton);

    expect(api.streamChat).toHaveBeenCalledTimes(3);
    expect(api.streamChat).toHaveBeenCalledWith(
      "Busco una crema hidratante",
      expect.any(String),
      expect.objectContaining({ age: 30 }),
      expect.any(Array),
      expect.any(Object),
      expect.any(AbortSignal)
    );
  });
});
