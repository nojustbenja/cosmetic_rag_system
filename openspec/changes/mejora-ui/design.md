# Design: Mejora UI

## Technical Approach
1. **Cleanup of unused shadcn components**: Analyze imports in `src/` to identify and safely remove unused `src/components/ui/` components.
2. **Refactor ChatPanel**:
   - Extract state (`messages`, `input`, `loading`, `statusLabel`, `sessionId`, `suggestions`, etc.) and the `send` / streaming logic to a custom hook `useChatStream`.
   - Break `ChatPanel.tsx` down into smaller UI components (e.g. `ChatHeader`, `MessageList`, `ChatInputArea`) to improve readability.
3. **ProductCard Accessibility**:
   - Replace `<motion.div role="button">` with `<motion.button>` for semantic interactive elements.
   - Remove redundant `onKeyDown` handlers for Enter/Space, since native buttons handle this automatically. Reset default button styles using utility classes to preserve the existing look.

## Architecture Decisions

### Decision: Extraction of Chat Logic into a Hook
**Choice**: Create a `useChatStream` hook to encapsulate the chat streaming and session state.
**Alternatives considered**: Keeping all logic inside `ChatPanel.tsx` or using a global state manager (Zustand/Redux).
**Rationale**: The logic is highly localized to the chat interface. A custom hook adheres to separation of concerns, making the UI components purely presentational, without introducing global state complexity.

### Decision: Semantic Elements for ProductCard
**Choice**: Use native `<motion.button>` for the card's interactive container.
**Alternatives considered**: Keep `<div>` and add `aria-pressed`, `tabIndex`, and `onKeyDown` handlers manually.
**Rationale**: Native buttons provide built-in keyboard accessibility (Space and Enter keys) and screen reader support without manual event handling overhead.

## Data Flow
```text
User Input -> ChatInputArea Component
ChatInputArea -> useChatStream (hook)
useChatStream -> streamChat API -> RAG Backend
RAG Backend -> (Server Sent Events) -> useChatStream (updates state)
useChatStream -> MessageList Component (UI update)
useChatStream -> onRecommendations Callback (triggers Parent App)
```

## File Changes
| File | Action | Description |
|------|--------|-------------|
| `src/components/ui/*.tsx` | Delete | Safely remove the ~36 unused shadcn components after confirming they are not imported anywhere in `src/`. |
| `src/hooks/useChatStream.ts` | Create | New hook encapsulating chat state, session persistence, and streaming logic. |
| `src/components/ChatPanel.tsx` | Modify | Strip logic out to use `useChatStream`. Use the new subcomponents to assemble the UI. |
| `src/components/chat/*` | Create | Move extracted subcomponents (e.g. `ChatHeader.tsx`, `ChatMessageList.tsx`, `ChatInputArea.tsx`) to a dedicated folder. |
| `src/components/ProductCard.tsx` | Modify | Change outer `<motion.div role="button">` to `<motion.button>`. Remove redundant keyboard handlers. Adjust styles for `<button>` compatibility. |

## Interfaces / Contracts

```typescript
// useChatStream Hook signature
export function useChatStream(options: {
  onRecommendations: (products: Product[], guides: unknown[]) => void;
  onClearChat: () => void;
  onProfile: (profile: ClientProfile) => void;
  clientProfile?: ClientProfile | null;
  onUpdateProductReason?: (productId: string, reason: string) => void;
  onRestoreSession?: (session: ChatSession) => void;
}) {
  // Returns state and methods needed by the UI
  return {
    messages,
    input,
    setInput,
    loading,
    statusLabel,
    sessionId,
    setSessionId,
    suggestions,
    historyOpen,
    setHistoryOpen,
    historySessions,
    setHistorySessions,
    send,
    handleStop,
    handleClear,
    handleInternalUpdateProductReason
  };
}
```

## Testing Strategy
| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `useChatStream` | Verify initial state and basic state transitions if testing environment is configured. |
| Integration | `ChatPanel` | Verify UI correctly renders messages and handles loading states from the hook. |
| E2E | `ProductCard` a11y | Verify the card is focusable via Tab and responds to Enter/Space keys to open the detail dialog. |

## Migration / Rollout
No complex migration needed. This is a purely structural refactor and cleanup. Changes can be deployed directly after verification since functionality remains identical.

## Open Questions
- [ ] Exactly which ~36 shadcn components are unused? We need to script or search across the codebase to compile the final deletion list during the apply phase.
