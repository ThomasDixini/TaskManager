---
id: 601
title: Board component (columns, quick-add, drag-and-drop, project filter)
status: done
wave: 6
depends_on: [401, 402, 501, 502]
priority: high
estimate: M
files:
  - client/src/app/features/board/board.component.ts
  - client/src/app/features/board/board.component.html
  - client/src/app/features/board/board.component.scss
  - client/src/app/app.routes.ts
prd_refs: [FR-1, FR-2, FR-7, FR-8, FR-9, FR-10, FR-11]
agent_ready: true
---

# 601 – Board component (columns, quick-add, drag-and-drop, project filter)

## Context (self-contained)

We are building a personal, local-only Kanban board app in Angular (standalone components, Angular Material, Angular CDK for drag-and-drop, Angular Signals for state). This is the final integration task: it composes everything built in prior tasks into the actual board screen, and wires it into the app's routing so it's the page the user sees.

The board has three fixed columns, in order: **To Do, In Progress, Done** (backend enum values `ToDo`, `InProgress`, `Done`). Each column has a quick-add input at the bottom for creating a task by title alone. Cards are draggable within and across columns. A project filter dropdown at the top of the board lets the user narrow the view to one project or "All". Clicking a card opens the task editor dialog.

Services and components already built (prior tasks) that this task must use, not reimplement:

**`TaskService`** (`client/src/app/features/tasks/task.service.ts`):
```ts
export class TaskService {
  readonly tasks: Signal<Task[]>;
  load(projectId?: number): void;
  create(title: string): Promise<Task>;
  update(id: number, changes: {...}): Promise<Task>;
  delete(id: number): Promise<void>;
  move(id: number, column: BoardColumn, position: number): Promise<Task>;
}
```

**`ProjectService`** (`client/src/app/features/projects/project.service.ts`):
```ts
export class ProjectService {
  readonly projects: Signal<Project[]>;
  load(): void;
  create(name: string): Promise<Project>;
}
```

**`TaskCardComponent`** (`client/src/app/features/board/task-card.component.ts`), selector `app-task-card`:
```ts
@Input({ required: true }) task!: Task;
@Input() projectName: string | null = null;
@Output() cardClick = new EventEmitter<Task>();
```

**`TaskEditorDialogComponent`** (`client/src/app/features/tasks/task-editor-dialog.component.ts`), opened via `MatDialog`:
```ts
export interface TaskEditorDialogData { task: Task; }
// Usage: this.dialog.open(TaskEditorDialogComponent, { data: { task } as TaskEditorDialogData, width: '480px' });
```

**Models** (`Task`, `BoardColumn`, `TaskPriority` from `task.model.ts`; `Project` from `project.model.ts`) as defined in prior tasks.

`app.routes.ts` currently has an empty `routes: Routes = []` array (from the initial scaffold task) — this task adds the real route.

## Interfaces you must conform to

- Component class name: `BoardComponent`, standalone, selector `app-board`, in `client/src/app/features/board/board.component.ts`.
- Route: add to `client/src/app/app.routes.ts`: `{ path: '', component: BoardComponent }` (the board is the app's home/only page for this MVP).
- Drag-and-drop: use `@angular/cdk/drag-drop` (`CdkDropList`, `CdkDrag`, `CdkDropListGroup`, and the `moveItemInArray`/`transferArrayItem` helpers or equivalent) to implement dragging cards within and between the three columns' `CdkDropList`s, connected via `cdkDropListGroup` (or explicit `[cdkDropListConnectedTo]`).

## What to do

1. Create `BoardComponent` as a standalone component importing: `TaskCardComponent`, `MatDialogModule`/`MatDialog`, `MatSelectModule` (or `MatButtonToggleModule`) for the project filter, `DragDropModule` from `@angular/cdk/drag-drop`, `FormsModule` or `ReactiveFormsModule` for the quick-add inputs and filter control.
2. Inject `TaskService`, `ProjectService`, and `MatDialog`.
3. On init, call `taskService.load()` and `projectService.load()`.
4. Maintain a local signal or computed value for the selected project filter (`selectedProjectId: number | null`, `null` = "All"). Changing the filter should re-fetch via `taskService.load(selectedProjectId ?? undefined)` (server-side filtering, matching the API contract from task 302).
5. Compute, per column, the filtered/sorted list of tasks to display: a `computed()` signal per column (or one computed returning a map) that filters `taskService.tasks()` by `column` and sorts by `position` ascending. Since `taskService.tasks()` already reflects the current filter (loaded via `load(projectId)`), no additional project filtering is needed here beyond the column split.
6. Render three columns (To Do / In Progress / Done), each as a `cdkDropList` (with a unique `id` per column, e.g. `'ToDo'`, `'InProgress'`, `'Done'`, and all three connected to each other via `cdkDropListGroup` or explicit `connectedTo`), containing `app-task-card` for each task in that column (passing `task` and the resolved `projectName` — look up the task's `projectId` against `projectService.projects()` to find the name, or `null` if `projectId` is `null` or not found), listening to `(cardClick)` to open the editor dialog.
7. Implement the quick-add input at the bottom of each column: a text input + submit (Enter key or a small "Add" button); on submit with non-empty text, call `taskService.create(title)`, then clear the input. Since the new task always lands in `ToDo` (per the API contract), it will only visually appear in the To Do column regardless of which column's input was used — implement it that way for the MVP (only show the quick-add input in the To Do column, since quick-add always creates a ToDo task; alternatively show it in all three columns but note it always adds to To Do — prefer only showing it in the To Do column to avoid a misleading UI).
8. Implement the project filter dropdown at the top of the board, populated from `projectService.projects()` plus an "All" option (`null`), bound to `selectedProjectId`, triggering the reload described in step 4 on change.
9. Wire the `cdkDropListDropped` (`(cdkDropListDropped)="onDrop($event)"`) handler on each column's drop list: determine the moved task's id, the target column (from the drop list's `id`), and the target index within that column, then call `taskService.move(taskId, targetColumn, targetIndex)`. After the move resolves, call `taskService.load(selectedProjectId ?? undefined)` to refresh from the server and get accurate positions for all affected tasks (simplest correct approach — avoids manually reconciling local array state against the backend's reindexing).
10. Update `client/src/app/app.routes.ts`: replace the empty `routes` array with `[{ path: '', component: BoardComponent }]`, importing `BoardComponent`.
11. Style (`board.component.scss`): three columns laid out horizontally (flexbox or CSS grid), each with a header (column name), a scrollable list area for cards, and the quick-add input pinned at the bottom of the To Do column. Keep it clean and functional — no need for elaborate visual design.

## Acceptance criteria

- [x] Navigating to `http://localhost:4200/` (with the backend running) shows three columns labeled To Do, In Progress, Done.
- [x] Typing a title into the To Do quick-add input and submitting creates a new task that appears in the To Do column (verify via the UI and/or that `GET /api/tasks` on the backend now includes it).
- [x] Clicking a card opens the task editor dialog (`TaskEditorDialogComponent`) pre-filled with that task's data; saving changes in the dialog updates the card's displayed title/project/priority on the board without a full page reload.
- [x] Dragging a card from one column to another persists the move (verify the task's column changed via a subsequent `GET /api/tasks` or by reloading the page and seeing it stay in the new column).
- [x] Dragging a card to a new position within the same column persists the reordering (verify via reload that the new order sticks).
- [x] Selecting a project in the filter dropdown shows only that project's tasks across all three columns; selecting "All" shows every task again.
- [x] Each card displays its project name (if set) and priority badge (if set), per `TaskCardComponent`'s existing rendering.
- [x] `ng build` succeeds and `ng serve` + navigating to `http://localhost:4200` shows a working board with no console errors during normal use (add/edit/delete/drag/filter).

## Out of scope

- Do not modify `TaskService`, `ProjectService`, `TaskCardComponent`, or `TaskEditorDialogComponent` internals — only import and use their existing public interfaces. If you find you need a change to one of them, stop and report it rather than editing those files directly.
- Do not implement customizable columns, multiple boards, due dates, labels, archiving, or any other explicitly out-of-scope PRD item.
- Do not add authentication or route guards — the board is the only, unguarded route.
