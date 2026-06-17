## Exploration: mejora-ui

### Current State
The frontend is built with React, Vite, Tailwind v4, and shadcn/ui. 
Currently, the `src/components/ui/` directory contains around 49 shadcn components, but a search reveals that ~36 of these are completely unused (e.g., `accordion`, `calendar`, `checkbox`, `table`, `form`, etc.).
Furthermore, the `ChatPanel.tsx` component has grown into a massive monolith (over 1000 lines), intertwining UI rendering, state management, complex auto-saving persistence, requestAnimationFrame batching, and chat streaming API logic.
Finally, some custom interactive elements, like the cards in `ProductCard.tsx`, are implemented as `div` tags with `role="button"` and `tabIndex={0}` instead of using semantically robust interactive elements or better focus management, impacting accessibility and keyboard navigation.

### Affected Areas
- `frontend/src/components/ui/*` — Many unused components inflating the codebase.
- `frontend/src/components/ChatPanel.tsx` — Massive file needing decomposition.
- `frontend/src/components/ProductCard.tsx` — Custom button implementations lacking ideal semantic structure.

### Approaches

1. **Cleanup Unused Shadcn Components**
   - Brief: Remove all shadcn UI components that are not currently referenced anywhere in the `src/` directory.
   - Pros: Reduces repository size, speeds up file searches, keeps the codebase lean and maintainable.
   - Cons: If future features need these components, they will have to be re-added via `shadcn add`.
   - Effort: Low

2. **Refactor ChatPanel (Hook Extraction & Component Splitting)**
   - Brief: Extract the complex streaming logic, state management, and persistence into a custom hook (e.g., `useChatStream.ts`), and split the UI into smaller sub-components (`ChatMessageList.tsx`, `ChatInputForm.tsx`).
   - Pros: Drastically improves readability and maintainability of the chat feature. Decouples business logic from presentation.
   - Cons: Requires careful refactoring to ensure `requestAnimationFrame` batching and scrolling behavior doesn't break.
   - Effort: High

3. **Accessibility (A11y) & Semantic Improvements**
   - Brief: Replace `div role="button"` implementations in `ProductCard.tsx` with native semantic HTML buttons or wrap interactive areas properly. Ensure appropriate `aria-expanded` and semantic region grouping.
   - Pros: Improves screen reader support and keyboard navigation for users. Conforms to WCAG standards.
   - Cons: May require minor CSS adjustments to reset native button styles.
   - Effort: Medium

### Recommendation
I recommend starting with **Approach 1** (Cleanup Unused Components) for an immediate easy win, and then executing **Approach 2** (Refactor ChatPanel). The `ChatPanel` is a central piece of the application, and separating its UI from its complex streaming logic is crucial for long-term health. If time permits, **Approach 3** should also be incorporated to ensure the base UI is accessible.

### Risks
- Refactoring `ChatPanel.tsx` might introduce regressions in the chat streaming experience (e.g., token batching or auto-scroll glitches).
- Removing shadcn components might accidentally remove a component that is used dynamically, though a thorough static search confirms 36 components are genuinely orphaned.

### Ready for Proposal
Yes. The orchestrator should present these approaches to the user and ask which areas of the UI improvement they'd like to prioritize (Cleanup, Refactor, or Accessibility).
