# Proposal: Mejora UI

## Intent
Clean up unused UI components, improve code maintainability in the chat feature, and fix accessibility issues in product cards to ensure a cleaner, more robust, and accessible application.

## Scope
### In Scope
- Remove ~36 unused shadcn components in `src/components/ui/`
- Refactor `ChatPanel.tsx` by extracting state and streaming logic into a `useChatStream` hook, and splitting the UI into smaller components
- Improve accessibility in `ProductCard.tsx` by replacing `<div role="button">` with semantic `<button>` elements

### Out of Scope
- Adding new behavioral features to the Chat interface
- Modifying components outside of the chat and product display areas
- System-wide accessibility audit

## Capabilities
### New Capabilities
- None

### Modified Capabilities
- `chat-interface`: Internal refactor to separate logic from presentation (strict 1-to-1 refactor, no behavioral changes).
- `product-display`: Enhanced accessibility and keyboard navigation compliance.

## Approach
1. **Cleanup**: Perform a final audit of `src/components/ui/` and safely remove the ~36 identified unused shadcn components.
2. **Refactor**: Extract chat state and message streaming logic from `ChatPanel.tsx` into a custom hook `useChatStream`. Decompose `ChatPanel.tsx` into smaller, focused React components.
3. **Accessibility**: Update `ProductCard.tsx` to use native `<button>` elements instead of `<div>`s for interactive elements, adjusting Tailwind styles to match the previous look while enabling native keyboard events.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `src/components/ui/` | Removed | Deletion of ~36 unused shadcn components |
| `src/components/.../ChatPanel.tsx` | Modified | Broken down into smaller UI components |
| `src/hooks/useChatStream.ts` | New | Custom hook encapsulating chat streaming logic |
| `src/components/.../ProductCard.tsx` | Modified | Accessibility updates to use semantic HTML |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Unintended removal of dynamically imported component | Low | Confirm usage globally before deletion |
| Regression in chat streaming behavior | Low | Strict 1-to-1 logic extraction; thorough verification |
| Visual regressions in `ProductCard` due to default button styles | Medium | Reset default button styles explicitly using Tailwind classes |

## Rollback Plan
Revert the relevant commits. Because these changes are strictly frontend refactoring and cleanup, a standard git revert is safe and will immediately restore prior functionality.

## Dependencies
- None

## Success Criteria
- [ ] No unused shadcn components remain in the defined scope.
- [ ] `ChatPanel` operates with existing functionality, powered by the new `useChatStream` hook.
- [ ] `ProductCard` passes keyboard navigation tests and automated accessibility checks.
