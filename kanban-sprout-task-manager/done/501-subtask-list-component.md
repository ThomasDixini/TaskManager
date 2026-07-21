---
id: 501
title: Subtask list component
status: done
wave: 5
depends_on: [401]
priority: high
estimate: S
files:
  - client/src/app/features/tasks/subtask-list.component.ts
  - client/src/app/features/tasks/subtask-list.component.html
  - client/src/app/features/tasks/subtask-list.component.scss
prd_refs: [FR-25]
agent_ready: true
---

# 501 – Subtask list component

## Context (self-contained)

We are building a small, self-contained UI component for displaying and managing a task's subtasks (checklist items with a done flag), to be embedded inside the task detail drawer (a later task, 601, composes this into `TaskDetailDrawerComponent`). This component owns its own data mutations (add/toggle) via `SubtaskService`, but receives its initial list via `@Input` from the parent (which already has it from `TaskService.getById`) rather than fetching it itself — avoiding a duplicate fetch.

**`SubtaskService`** (`client/src/app/features/tasks/subtask.service.ts`, already exists):
```ts
export class SubtaskService {
  create(taskId: number, text: string): Promise<Subtask>;
  toggle(taskId: number, subtaskId: number, done: boolean): Promise<Subtask>;
}
```
**`Subtask` model** (`client/src/app/features/tasks/subtask.model.ts`):
```ts
export interface Subtask { id: number; text: string; done: boolean; position: number; }
```

## Interfaces you must conform to

- Component class name: `SubtaskListComponent`, standalone, selector `app-subtask-list`, in `client/src/app/features/tasks/subtask-list.component.ts`.
- Inputs/outputs:
  ```ts
  @Input({ required: true }) taskId!: number;
  @Input({ required: true }) subtasks!: Subtask[];
  @Output() subtasksChanged = new EventEmitter<Subtask[]>();
  ```
  The component maintains its own internal copy of the list (seeded from `subtasks` on init/change) so it can update immediately on add/toggle without waiting for the parent to re-fetch; every time the internal list changes, it emits the full updated array via `subtasksChanged` so the parent (the drawer shell) can keep its own state in sync (e.g. to update subtask-progress displays elsewhere).

## What to do

1. Create `SubtaskListComponent` as a standalone component (Angular Material `MatCheckboxModule` or a custom checkbox, `MatInputModule`/`FormsModule` for the inline add field).
2. Inject `SubtaskService`.
3. On `ngOnInit` (and via `ngOnChanges` if `subtasks` input changes after init, e.g. when the parent re-fetches), copy the input array into an internal signal, e.g. `readonly items = signal<Subtask[]>([])`.
4. Template: render each subtask as a checkbox row (checked = `done`), with a strikethrough style on the text when done. Clicking the checkbox calls `subtaskService.toggle(taskId, subtask.id, !subtask.done)`, and on success updates the matching entry in `items` (immutably) and emits `subtasksChanged` with the new array. Below the list, an inline text input for adding a new subtask (Enter to submit) that calls `subtaskService.create(taskId, text)`, and on success appends the new subtask to `items` (immutably), clears the input, and emits `subtasksChanged`.
5. Also render a small progress summary (e.g. "2/4") and a thin progress bar above the list, computed from `items()`.
6. Style (`subtask-list.component.scss`): compact list rows, consistent with the cream/coral tokens from task 101 (checkbox accent color via `var(--accent)`, done-item text color `var(--ink-2)`).

## Acceptance criteria

- [x] Given `subtasks = [{id:1,text:'A',done:false,position:0}, {id:2,text:'B',done:true,position:1}]`, the component renders two rows, "A" unchecked and "B" checked-with-strikethrough, and a "1/2" progress summary.
- [x] Clicking the checkbox for "A" calls `subtaskService.toggle(taskId, 1, true)`; on resolution, the row updates to checked/strikethrough and `subtasksChanged` emits an array where subtask 1 now has `done: true`.
- [x] Typing "C" into the add input and pressing Enter calls `subtaskService.create(taskId, 'C')`; on resolution, a new row for "C" appears (unchecked), the input clears, and `subtasksChanged` emits the array including the new subtask.
- [x] With `subtasks = []`, the list area is empty (no error) and the add input still works.
- [x] `ng build` succeeds (the component doesn't need to be embedded anywhere yet — that's task 601's job).

## Out of scope

- Do not fetch the initial subtask list itself — it's provided via `@Input`.
- Do not implement subtask deletion or reordering — not part of this MVP's API.
- Do not touch `client/src/app/features/tasks/task-detail-drawer.component.*` or `client/src/app/features/tasks/comment-feed.component.*` (owned by task 502, running in parallel).
