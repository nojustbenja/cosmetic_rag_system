# Tasks: Mejora UI

## Review Workload Forecast
| Field | Value |
|-------|-------|
| Estimated changed lines | ~2000 (Deletions + Refactor of 1500+ loc files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 1. Delete unused shadcn components <br>2. Extract `useChatStream` hook <br>3. Extract `ChatPanel` subcomponents <br>4. Update `ProductCard` accessibility |
| Delivery strategy | chained-prs |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Phase 1: Unused Components Cleanup
- [x] 1.1 Analyze imports in `frontend/src/` to identify exactly which of the ~36 `frontend/src/components/ui/` shadcn components are unused.
- [x] 1.2 Delete the identified unused shadcn components from `frontend/src/components/ui/`.

## Phase 2: Chat State Logic Extraction
- [x] 2.1 Create new file `frontend/src/hooks/useChatStream.ts`.
- [x] 2.2 Extract chat state (`messages`, `input`, `loading`, `statusLabel`, `sessionId`, `suggestions`, etc.) from `frontend/src/components/ChatPanel.tsx` into `useChatStream`.
- [x] 2.3 Extract chat actions (`send`, `handleStop`, `handleClear`, `handleInternalUpdateProductReason`) from `ChatPanel` into `useChatStream`.
- [x] 2.4 Update `ChatPanel.tsx` to use the new `useChatStream` hook.

## Phase 2.5: Hotfixes
- [x] 2.5.1 Move storage functions out of `ChatHistoryDrawer.tsx` into `frontend/src/utils/storage.ts` to fix ESLint warnings.
- [x] 2.5.2 Update `ChatProfile.tsx` (and `ChatHistoryDrawer.tsx`) to replace hardcoded `emerald` colors with theme variables (`text-primary`, `bg-primary`, etc.).

## Phase 3: ChatPanel UI Component Breakdown
- [x] 3.1 Create `frontend/src/components/chat/` directory.
- [x] 3.2 Extract `ChatHeader` component into `frontend/src/components/chat/ChatHeader.tsx`.
- [x] 3.3 Extract `ChatMessageList` component into `frontend/src/components/chat/ChatMessageList.tsx`.
- [x] 3.4 Extract `ChatInputArea` component into `frontend/src/components/chat/ChatInputArea.tsx`.
- [x] 3.5 Refactor `frontend/src/components/ChatPanel.tsx` to compose the new subcomponents.

## Phase 4: ProductCard Accessibility Improvements
- [x] 4.1 In `frontend/src/components/ProductCard.tsx`, change the outer `<motion.div role="button">` to a semantic `<motion.button>`.
- [x] 4.2 Remove redundant `onKeyDown` handlers for Enter/Space in `ProductCard.tsx`.
- [x] 4.3 Add utility classes to reset default `<button>` styling so it maintains the existing visual appearance.
