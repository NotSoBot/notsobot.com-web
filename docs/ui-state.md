# UI state patterns

Most UI bugs here have come from *implicit state machines*: a handful of `useState` flags plus a mutation that together
encode one flow (confirm → pending → error → done, edit → saving → saved) and drift into combinations nobody meant.
These are the shared pieces and the rules that keep those flows honest. Reach for them before hand-rolling the shape again.

## Shared primitives

| Need | Use | Where |
|---|---|---|
| "Copied" check mark after copying | `CopyButton`, or `useCopied()` for custom UI | `src/components/ui/CopyButton.tsx`, `src/hooks/useCopied.ts` |
| Filters / search / page in the URL | `useSearchParamState()` (+ `LocalSearchParamsContext` inside a modal over a list) | `src/hooks/useSearchParamState.ts` |
| Page left empty after deleting the last row | `useStepBackFromEmptyPage()` | `src/hooks/useSearchParamState.ts` |
| ← / → between items in a browsing modal | `useArrowKeyNavigation()` / `isArrowNavigationTarget()` | `src/hooks/useArrowKeyNavigation.ts` |
| Close a menu/popover on outside click or Escape | `useDismiss(ref, open, close)` | `src/hooks/useDismiss.ts` |
| Form edits over saved server values | `useDraft(saved)`: `values`, `changes`, `dirty`, `set`, `reset`, `commit(sent)` | `src/pages/dashboard/settings/useDraft.ts` |
| Yes/no for destructive actions | `ConfirmDialog` (`pending`, `error`, `confirmPhrase`, `acknowledgement`) | `src/components/ui/ConfirmDialog.tsx` |
| Unsaved edits when leaving a page | `SaveBar` + `UnsavedChangesGuard` (`state.skipUnsavedGuard` to pass a confirmed discard) | `src/pages/dashboard/ui.tsx` |
| Dialogs, scroll lock, focus, Escape | `Modal` (keeps a stack; `openModalCount()`) | `src/components/ui/Modal.tsx` |

## Rules

**One mode, one piece of state.** Dialogs that can't be open together are one union, not several nullables:
`useState<{kind: 'rename', voice: Voice} | {kind: 'delete', voice: Voice} | null>(null)` (see `ApplicationsPage`).

**Don't duplicate mutation status.** `mutation.isPending`, `mutation.error` and `mutation.variables` (which row is busy)
already exist; extra `saving`/`busyKey`/`pendingId` flags drift from them.

**Never `mutation.reset()` while it's pending.** In TanStack Query v5 that detaches the observer: the call's
`onSuccess`/`onError` never fire, `isPending` goes false and Save re-enables mid-request. Guard it:
`if (!mutation.isPending) mutation.reset()`.

**Reset a confirm's mutation when the dialog closes,** or reopening it shows the last attempt's error.

**Per-call callbacks die with the component.** `mutate(v, {onSuccess})` callbacks don't run once the component has
unmounted (a keyed detail modal stepping to the next item, a row removed from the cache before invalidation finishes).
When the feedback must survive, use `mutateAsync` (see `useUndoStatusAction`), or keep the component mounted until it
settles.

**Saves mustn't wipe what was typed meanwhile.** After a save, `draft.commit(sent)` drops only the edits that still equal
what was sent; `reset()` drops everything. Same for plain inputs: clear a message box only if it still holds the text
that was sent.

**Snapshot what a dialog acts on when it opens.** Lists poll and caches update optimistically; a confirm that reads
live data can change its title, phrase or targets under the user (selected ids, `blocked`, pending identities).

**Report "dirty" upward with cleanup.** A child that tells its parent it has unsaved edits must report `false` on
unmount (`useEffect(() => () => onDirtyChange(false), [])`), or the parent keeps prompting after the child is gone.

**Nested dialogs freeze the one below.** Keyboard shortcuts on a browsing modal check `isArrowNavigationTarget()`, and
per-item bodies are keyed by item id so a nested dialog's state can't carry over to another item.
