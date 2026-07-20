---
id: 501
title: Task editor dialog (edit, inline project creation, delete)
status: done
wave: 5
depends_on: [401, 402]
priority: high
estimate: M
files:
  - client/src/app/features/tasks/task-editor-dialog.component.ts
  - client/src/app/features/tasks/task-editor-dialog.component.html
  - client/src/app/features/tasks/task-editor-dialog.component.scss
prd_refs: [FR-3, FR-4, FR-5, FR-6]
agent_ready: true
---

# 501 – Task editor dialog (edit, inline project creation, delete)

## Context (self-contained)

We are building a personal, local-only Kanban board app in Angular (standalone components, Angular Material for UI, Angular Signals for state). Clicking a task card (built by a parallel task, 502) must open an editor without navigating away from the board — this task builds that editor as an Angular Material dialog (`MatDialog`).

The editor lets the user change a task's Title, Description, Project (dropdown of existing projects, with an inline "add new project" option so the user never has to leave this dialog to create one), and Priority (Low/Medium/High or unset). It also has a Delete action with a confirmation step.

Two services already exist and must be used, not reimplemented:

**`TaskService`** (`client/src/app/features/tasks/task.service.ts`), injectable, `providedIn: 'root'`:
```ts
export class TaskService {
  readonly tasks: Signal<Task[]>;
  load(projectId?: number): void;
  create(title: string): Promise<Task>;
  update(id: number, changes: { title: string; description: string | null; projectId: number | null; priority: TaskPriority | null }): Promise<Task>;
  delete(id: number): Promise<void>;
  move(id: number, column: BoardColumn, position: number): Promise<Task>;
}
```

**`ProjectService`** (`client/src/app/features/projects/project.service.ts`), injectable, `providedIn: 'root'`:
```ts
export class ProjectService {
  readonly projects: Signal<Project[]>;
  load(): void;
  create(name: string): Promise<Project>;
}
```

**`Task` model** (`client/src/app/features/tasks/task.model.ts`):
```ts
export type BoardColumn = 'ToDo' | 'InProgress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export interface Task {
  id: number; title: string; description: string | null; projectId: number | null;
  priority: TaskPriority | null; column: BoardColumn; position: number;
}
```

**`Project` model** (`client/src/app/features/projects/project.model.ts`):
```ts
export interface Project { id: number; name: string; }
```

## Interfaces you must conform to

- Component class name: `TaskEditorDialogComponent`, standalone, in `client/src/app/features/tasks/task-editor-dialog.component.ts`, using `MatDialogRef` and `MAT_DIALOG_DATA` from `@angular/material/dialog`.
- Dialog data input (what the caller passes via `MatDialog.open(TaskEditorDialogComponent, { data })`):
  ```ts
  export interface TaskEditorDialogData {
    task: Task;
  }
  ```
- The board component (a later task, 601) will open this dialog like:
  ```ts
  this.dialog.open(TaskEditorDialogComponent, { data: { task } as TaskEditorDialogData, width: '480px' });
  ```
  Export `TaskEditorDialogData` from `task-editor-dialog.component.ts` so the board component can import and use it.
- The dialog does not need to emit anything special on close — since it calls `TaskService.update`/`delete` directly (which update the shared `TaskService.tasks` signal), the board component (which reads that same signal) will reactively reflect changes without needing dialog result data. Simply call `this.dialogRef.close()` after a successful save or delete.

## What to do

1. Create `TaskEditorDialogComponent` as a standalone component importing: `MatDialogModule`, `MatFormFieldModule`, `MatInputModule`, `MatSelectModule`, `MatButtonModule`, `ReactiveFormsModule` (or template-driven forms — your choice, reactive forms recommended for the dropdown + validation).
2. Inject `MAT_DIALOG_DATA` (typed as `TaskEditorDialogData`) to get the task being edited, `MatDialogRef<TaskEditorDialogComponent>` to close the dialog, `TaskService`, and `ProjectService`.
3. On init, call `this.projectService.load()` to ensure the projects dropdown has fresh data (safe to call even if already loaded — it just re-fetches).
4. Build a form (or plain component state with signals) pre-populated from `data.task`: Title (text input, required), Description (textarea, optional), Project (a `mat-select` populated from `projectService.projects()`, showing project names, with a special "+ Add new project…" option at the top or bottom of the list), Priority (a `mat-select` with options Low/Medium/High plus a "None" option mapping to `null`).
5. Implement the inline "add new project" flow: selecting the "+ Add new project…" option should prompt for a name (a simple approach: reveal a small inline text input + confirm button within the dialog, not a separate nested dialog) and call `projectService.create(name)`; once it resolves, select the newly created project in the dropdown automatically.
6. Implement Save: on submit, call `taskService.update(data.task.id, { title, description, projectId, priority })`; on success, close the dialog (`dialogRef.close()`). Disable the save button while the title field is empty (required field).
7. Implement Delete: a delete button that, when clicked, shows a confirmation step (a simple approach: a second "confirm delete?" state within the same dialog with Yes/Cancel buttons — a separate `MatDialog` confirmation is also acceptable if you prefer, but not required). On confirm, call `taskService.delete(data.task.id)`; on success, close the dialog.
8. Style minimally via `task-editor-dialog.component.scss` — form fields stacked vertically, adequate spacing; no need for elaborate design.

## Acceptance criteria

- [x] Opening the dialog with a given `Task` pre-fills Title, Description, Project selection, and Priority selection to match that task's current values.
- [x] Changing fields and clicking Save calls `TaskService.update` with the new values and closes the dialog on success; the task's entry in `TaskService.tasks()` reflects the changes afterward (verifiable since the board, once built, reads that same signal).
- [x] The Project dropdown lists all projects from `ProjectService.projects()` by name, plus an option to add a new project inline.
- [x] Using the inline "add new project" flow creates a project via `ProjectService.create`, and the new project becomes available and selected in the dropdown without closing the task editor.
- [x] The Priority dropdown offers Low, Medium, High, and a way to select "no priority" (`null`).
- [x] Clicking Delete requires a confirmation step before actually calling `TaskService.delete`; confirming deletes the task and closes the dialog.
- [x] The Save button is disabled (or shows a validation error) when the Title field is empty.
- [x] No compile errors; `ng build` succeeds with this component added (it doesn't need to be routed/rendered anywhere yet — that's task 601's job).

## Out of scope

- Do not create the task card component that triggers opening this dialog — that's task 502, running in parallel.
- Do not wire this dialog into the board component or any route — that's task 601's job, in a later wave.
- Do not implement project rename/delete — not part of this MVP.
- Do not touch `client/src/app/features/board/` files (owned by tasks 502 and 601).
