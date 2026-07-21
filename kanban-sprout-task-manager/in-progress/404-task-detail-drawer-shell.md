---
id: 404
title: Task detail drawer shell
status: in-progress
wave: 4
depends_on: [303, 304]
priority: high
estimate: M
files:
  - client/src/app/features/tasks/task-detail-drawer.component.ts
  - client/src/app/features/tasks/task-detail-drawer.component.html
  - client/src/app/features/tasks/task-detail-drawer.component.scss
prd_refs: [FR-19, FR-20, FR-21, FR-22, FR-23, FR-24]
agent_ready: true
---

# 404 – Task detail drawer shell

## Context (self-contained)

We are replacing the existing task editor (a centered Material dialog) with a right-side slide-in drawer, per the "Sprout" redesign. This task builds the drawer's **shell**: header (project, delete, close), title, metadata (status/priority as segmented controls that apply immediately, due date, labels), and the notes/description section. A later task (601) will compose two child components — a subtask list and a comment feed — into this shell's body; this task should leave clear composition points for them (see "What to do", step 6) but does not need those components to exist yet.

Two services this task depends on, both already implemented:

**`TaskService`** (`client/src/app/features/tasks/task.service.ts`):
```ts
export class TaskService {
  readonly tasks: Signal<Task[]>;
  load(projectId?: number): void;
  create(title: string, column?: BoardColumn): Promise<Task>;
  update(id: number, changes: { title: string; description: string | null; projectId: number | null; priority: TaskPriority | null; dueDate: string | null; labelIds: string[] }): Promise<Task>;
  delete(id: number): Promise<void>;
  move(id: number, column: BoardColumn, position: number): Promise<Task>;
  getById(id: number): Promise<TaskDetail>;
}
```

**`LabelService`** (`client/src/app/features/labels/label.service.ts`):
```ts
export class LabelService {
  readonly labels: Signal<Label[]>;   // { id: string; name: string; tone: string }
  load(): void;
}
```

**Models** (`client/src/app/features/tasks/task.model.ts`):
```ts
export type BoardColumn = 'Backlog' | 'ToDo' | 'InProgress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export interface Task { id: number; title: string; description: string | null; projectId: number | null; priority: TaskPriority | null; column: BoardColumn; position: number; dueDate: string | null; labelIds: string[]; subtaskTotal: number; subtaskDone: number; commentCount: number; }
export interface Subtask { id: number; text: string; done: boolean; position: number; }
export interface Comment { id: number; text: string; createdAt: string; }
export interface TaskDetail extends Task { subtasks: Subtask[]; comments: Comment[]; }
```

The app has three (`Backlog`, `ToDo`, `InProgress`, `Done` — four) fixed columns and three priority levels. The old `TaskEditorDialogComponent` (still present in the codebase, unmodified by this task) used `MatDialog` with a Save/Cancel flow for title/description/project/priority and a confirm-before-delete flow — this drawer replaces its role but changes the interaction model for status/priority to apply-immediately (per the Sprout design), while title/description/project/labels/due-date still batch into an explicit Save.

## Interfaces you must conform to

- Component class name: `TaskDetailDrawerComponent`, standalone, in `client/src/app/features/tasks/task-detail-drawer.component.ts`, using `MatDialogRef` and `MAT_DIALOG_DATA` from `@angular/material/dialog` (reusing `MatDialog` as the opening mechanism, but styled/positioned to render as a right-side slide-in panel rather than a centered dialog).
- Dialog data input:
  ```ts
  export interface TaskDetailDrawerData { taskId: number; }
  ```
  Export this from the component file. The caller (a later task, 701) will open it like:
  ```ts
  this.dialog.open(TaskDetailDrawerComponent, {
    data: { taskId } as TaskDetailDrawerData,
    panelClass: 'tm-detail-drawer-panel',
    position: { right: '0' },
    height: '100%',
    width: 'min(520px, 100vw)',
  });
  ```
  Style `.tm-detail-drawer-panel` (and Angular Material's backdrop) in this task's `.scss` file (global styles may be needed for the `::ng-deep` panel class or a `styles.scss` addition — prefer scoping via the panel class selector applied to `.mat-mdc-dialog-container` inside this component's own stylesheet using `::ng-deep`, keeping the change local to this file) so the dialog renders full-height, right-anchored, without the default centered/rounded-all-corners dialog chrome — a right-anchored panel with rounded corners only on the left side, and a slide-in-from-right animation, matching the prototype's `.tm-drawer` treatment.
- On init, this component must call `this.taskService.getById(data.taskId)` to load the full `TaskDetail` (including subtasks/comments — even though this task doesn't render them yet, the shell should store the fetched detail so task 601 can bind child components to `detail().subtasks` / `detail().comments` without re-fetching). Store it in a signal, e.g. `readonly detail = signal<TaskDetail | null>(null)`.
- Also call `this.labelService.load()` on init (safe to call even if already loaded).

## What to do

1. Create `TaskDetailDrawerComponent` as a standalone component importing: `MatDialogModule`, `MatFormFieldModule`, `MatButtonModule`, `MatButtonToggleModule` (for the status/priority segmented controls), `MatSelectModule` (for labels multi-select and/or due date, your choice of concrete controls), `MatIconModule`, `ReactiveFormsModule`/`FormsModule` as needed.
2. Inject `MAT_DIALOG_DATA` (typed `TaskDetailDrawerData`), `MatDialogRef<TaskDetailDrawerComponent>`, `TaskService`, `LabelService`.
3. On init: fetch `taskService.getById(data.taskId)` into the `detail` signal; call `labelService.load()`.
4. Header: project name (resolve from `task.projectId` — for this task, it's acceptable to just show the raw `projectId` or omit project display if `ProjectService` isn't injected; simplest correct approach is to inject `ProjectService` too, matching the existing dialog's pattern, and resolve the name the same way `TaskEditorDialogComponent` does), a delete icon button (with a confirm step, mirroring the existing `TaskEditorDialogComponent`'s two-step delete UX: click Delete → show "confirm?" state → Yes/Cancel), and a close icon button (`dialogRef.close()`).
5. Body: task title (editable text field), description (editable textarea), a **Status** segmented control (`mat-button-toggle-group`) with one segment per `BoardColumn` value (Backlog/To Do/In Progress/Done) that, on change, immediately calls `taskService.move(taskId, newColumn, /* append to end: use a large position or 0 — since exact position isn't critical from the drawer, position 0 is acceptable */ 0)` — no separate Save step for this field. A **Priority** segmented control (Low/Medium/High) that, on change, immediately calls `taskService.update(taskId, { ...current values with new priority })` — no separate Save step. A due-date input (native `<input type="date">` bound to `detail().dueDate`, updated via the batched Save described next). A labels multi-select populated from `labelService.labels()`, showing checkboxes/chips per label, bound similarly.
6. Batched Save: title/description/dueDate/labelIds (NOT status/priority, which apply immediately per step 5) are saved together via an explicit Save button calling `taskService.update(taskId, { title, description, projectId: detail().projectId, priority: detail().priority, dueDate, labelIds })`, closing the drawer on success.
7. Leave a clear composition point in the template for task 601: a labeled section (e.g. a `<div class="drawer-subtasks-slot">` and `<div class="drawer-comments-slot">`, or simply comment markers `<!-- SUBTASK_LIST_GOES_HERE -->` / `<!-- COMMENT_FEED_GOES_HERE -->`) after the labels section, so task 601 can insert `<app-subtask-list>`/`<app-comment-feed>` there without restructuring the rest of the template.
8. Style (`task-detail-drawer.component.scss`): right-anchored full-height panel per the interface section above, form fields stacked vertically, segmented controls styled consistently with the cream/coral tokens from task 101.

## Acceptance criteria

- [ ] Opening the drawer with a given `taskId` fetches and displays that task's title, description, status, priority, due date, and labels, matching what `GET /api/tasks/{id}` returns.
- [ ] Changing the Status segmented control immediately calls `TaskService.move` (verify via a subsequent `taskService.tasks()` check or a fresh `getById` call) — no Save click needed.
- [ ] Changing the Priority segmented control immediately calls `TaskService.update` with the new priority — no Save click needed.
- [ ] Editing title/description/due date/labels and clicking Save calls `TaskService.update` with all of them at once, and closes the drawer on success.
- [ ] The Labels control lists all entries from `LabelService.labels()`.
- [ ] Delete requires a confirmation step before calling `TaskService.delete`; confirming deletes and closes the drawer.
- [ ] The drawer renders as a right-anchored, full-height panel (not a centered dialog) — verify visually via `ng serve` and a throwaway harness that opens it (e.g. a temporary button/test spec — delete any throwaway harness file afterward, it's not part of this task's file scope).
- [ ] `ng build` succeeds (the drawer doesn't need to be opened from the board yet — that's task 701's job).

## Out of scope

- Do not render subtasks or comments yet — leave the composition slot as described; task 601 wires in the actual child components.
- Do not modify `client/src/app/features/tasks/task-editor-dialog.component.*` — it remains in the codebase, untouched, until task 701 replaces its usage.
- Do not touch `client/src/app/features/board/` files.
