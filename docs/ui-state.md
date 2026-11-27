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

## The Activity and the editor

`src/editor` and `src/activity-games` run on a websocket next to http, so most of their state machines have a second
writer (the room, the game) and a slower one (an upload, a join). The rules above hold, plus these.

**A late answer asks whether its screen is still there.** A join, create, fork or upload that finishes after the user
moved on must not navigate. The Activity host's `setPhase(to, from)` drops a change whose `from` is no longer the phase
on screen, and `failed` is final. Elsewhere use a token or sequence number (`useRoomPages`, `LobbyList`, `counts.ts`).

**One action at a time is one piece of state.** A screen that can start several things (join this room, start a new one,
quick play) holds one union for "what is this screen doing" (`RoomsAction` in `GameRooms`, `joining` in `LobbyList`,
`StartState` in `StartScreen`) and disables the rest while it is set. Per-row flags let two run at once.

**Pointer gestures name their pointer.** A gesture's state carries the `pointerId` that started it; other pointers are
ignored, and it ends on `pointerup`, `pointercancel`, `lostpointercapture` or a mouse move with no button down. Letter
Trail's input is a pure reducer (`letterTrailInput.ts`, `trailReduce`) so it can be checked without a browser.

**A field being typed in shows what was typed.** In a room every keystroke is an op the api may refuse, and a refusal
puts the step back. `useFieldDraft` (`ParamControls.tsx`) keeps the text while the field has focus and still forwards
every change; drop the draft when another control changes the same value.

**A failure is its own state, with a way out.** Not "missing", not "up to date", not `null`: `failed` with Retry or
Back. Only a 404 is "doesn't exist".

**Don't lock with `<fieldset disabled>` alone.** It doesn't cover drag-and-drop, portals (colour picker, dialogs) or a
change that finishes after an await. The document hook refuses edits itself while `editLock` is set.

**Phase and status switches end in a `never` check,** with no runtime throw when the value comes off the wire.

### State in the DOM

Screens put their state on their root as `data-*`, so a test or an agent driving a browser reads it without parsing
translated text. Add one when you add a state; keep the values equal to the union's.

| Where | Attributes |
|---|---|
| Activity root | `data-state` (the phase: `loading`, `failed`, `choice`, `lobbies`, `start`, `editor`, `games_tab`, `games`, `game`, `flag_carry`, `server_settings`, `user_settings`, or `crashed`), `data-step` while loading, `data-failure` when failed |
| Reconnecting pill | `data-state="reconnecting"` |
| Game room | `data-phase` (`joining`, `lobby`, `round`, `reveal`, `finished`), `data-status` (`connecting`, `open`, `reconnecting`, `left`, `denied`), `data-role` (`host`, `player`, `watcher`) |
| Flag round | `data-state` (`watching`, `countdown`, `waiting_flag`, `choosing`, `chosen`, `typing`, `solved`), `data-round` |
| Letter Trail | `data-phase` (`countdown`, `dealing`, `playing`, `watching`, `over`, `reveal`), `data-trail` (`idle`, `tapped`, `dragging`, `typed`), tiles `data-tile` / `data-letter` / `data-tone`, word line `data-result` (`hit`, `miss:<reason>`) |
| Game rooms | root `data-state` (`idle`, `picking`, `starting`, `probing`, `unlocking`, `creating`), list `data-state` (`loading`, `error`, `empty`, `ready`), cards `data-state` (`idle`, `probing`, `refused`) |
| Activity settings | `data-screen`, `data-state` (`loading`, `ready`, `error`) |
| Editor root | `data-state` (`loading`, `missing`, `failed`, `ready`), `data-edit-lock` (`none`, `watching`, `rendering`), `data-save-state` (`saved`, `saving`, `error`) |
| Preview | `data-preview-state` (`idle`, `updating`, `preparing`, `busy`, `failed`), `data-stage` (`media`, `proxy_failed`, `failed`, `preparing`) |
| Render panel | `data-state` (`idle`, `running`, `done`, `failed`), `data-job-status`, result `data-share-state` |
| Start screen | `data-state` (`idle`, `dragging`, `uploading`, `failed`), `data-blocked` |
| Editor rooms list | `data-state` (`refreshing`, `ready`, `failed`), `data-joining`; cards `data-state` (`idle`, `asking`, `joining`, `refused`), `data-lobby-id` |
| Steps | rows `data-step-id`, `data-state` (`idle`, `selected`, `failed`), `data-locked`; fields `data-state` (`synced`, `typing`, `refused`) |
| On-preview tools | `data-tool` (`point`, `box`, `strokes`), `data-state` (`idle`, `dragging`, `pinching`, `editing`, `drawing`) |
| Hub | root `data-state` (`loading`, `error`, `ready`), cards `data-state` (`idle`, `trying`, `error`), publish `data-hub-status` |
| Dialog forms | `data-state` (`idle`, `pending`, `error`, and `saved` / `sent` where there is one) |

The dev mocks reach most of these without Discord: `/activity?mockGame=1` (see the options at the top of
`src/activity-games/mock/FlagGameMockApp.tsx`), `/activity?mockSettings=1`, `/activity?mockUserSettings=1`, and
`/editor` with `VITE_DASHBOARD_MOCKS=true`.

## Tests

`npm test` (Vitest, under a second). The state machines above that can run without a browser have a test file next to
them, and a change to one should come with a case in it:

| Machine | Source | Tests |
|---|---|---|
| The Activity's phases (`setPhase(to, from)`, `failed` is final) | `src/editor/hosts/activityPhase.ts` | `activityPhase.test.ts` |
| The editor's document: http saves, conflicts, room ops, locks, previews | `src/editor/useEditorDocument.ts` | `useEditorDocument.test.ts` (on real React, `src/test/renderHook.ts`) |
| The Activity's socket: reconnects, pong watchdog, joins, step locks | `src/editor/room.ts` | `room.test.ts` |
| A game's connection: join, status, `pendingOp`, answer queues, clock | `src/activity-games/connection.ts` | `connection.test.ts` |
| Which game screen shows, and what a close code does | `src/activity-games/gameScreen.ts` | `gameScreen.test.ts` |
| A flag round's answer area | `src/activity-games/answerState.ts` | `answerState.test.ts` |
| Letter Trail's pointer and keyboard input | `src/activity-games/letterTrailInput.ts` | `letterTrailInput.test.ts` |
| The preview's status line | `src/editor/components/previewBadge.ts` | `previewBadge.test.ts` |
| The dev fakes behind `/activity?mockGame=1` | `src/activity-games/mock/` | `mock/fakes.test.ts` |

How they're written:

- **A pure function gets its own module.** A reducer or a "which screen" function inside a component file can't be
  imported without the whole app, and exporting it from there breaks Fast Refresh for that file. Move it next door
  (`import type` only) and test it as a table, `it.each` over every input where the types allow.
- **Time is faked, never waited for.** `vi.useFakeTimers()` with `Date` and `performance`, `vi.spyOn(Math, 'random')`
  wherever a wait has jitter, a fake `WebSocket` through `vi.stubGlobal`. No sleeps, no network.
- **Fakes are typed against the real thing** (`Pick<EditorApi, …>`, `implements Pick<EditorRoom, …>`), with one cast
  where they go in, so a renamed method fails the type-check before the test runs.
- **A hook runs on real React.** `renderHook` and `advance(ms)` from `src/test/renderHook.ts` keep every render and
  timer step inside `act`; the hook tests fail on any `console.error`, which is how an update that escaped `act` shows.
- **One `it` per behaviour, named as the sentence it proves.** A test for a bug should fail on the code from before the
  fix: check it against `git show HEAD~:<path>` through a throwaway config that aliases the import, not by editing source.
