---
id: 401
title: Board component — dynamic columns, add/rename/delete, drag-to-reorder
status: backlog
wave: 4
depends_on: [302, 103]
priority: high
estimate: M
files:
  - client/src/app/features/board/board.component.ts
  - client/src/app/features/board/board.component.html
  - client/src/app/features/board/board.component.scss
prd_refs: [FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13]
agent_ready: true
---

# 401 – Board component — dynamic columns, add/rename/delete, drag-to-reorder

## Context (self-contained)

We are converting the board's fixed 4-column layout into a dynamic one driven by a real Columns API — the user can now add, rename, delete, and reorder columns beyond the four defaults (Backlog, To Do, In Progress, Done), which stay protected (fixed name, cannot be deleted, but *can* still change position). Two prior tasks already did the groundwork this task builds on: task 302 (frontend `ColumnService`) and task 103 (widened the frontend `BoardColumn` type from a 4-value union to plain `string`).

**`ColumnService`** (`client/src/app/features/columns/column.service.ts`, already exists):
```ts
export interface Column { id: number; name: string; hint: string | null; position: number; isDefault: boolean; }
export class ColumnService {
  readonly columns: Signal<Column[]>;   // ordered by position
  load(): void;
  create(name: string): Promise<Column>;
  rename(id: number, name: string): Promise<Column>;
  delete(id: number): Promise<void>;
  reorder(orderedIds: number[]): Promise<Column[]>;
}
```

**Important**: tasks reference their column by **name** (a `string`, e.g. `task.column === 'InProgress'` or `'Review'`), not by the `Column` entity's numeric `id` — that's how the Tasks API (`TaskDto.column`, `CreateTaskRequest.column`, `MoveTaskRequest.column`) already works and this task does not change that wire contract. The `Column.id` is only used for the Columns-management operations themselves (rename/delete/reorder all take an `id`), never for matching a task to its column.

**Also important**: `Column.name` for the 4 defaults is still the exact machine-form string the wire contract has always used (`"ToDo"`, `"InProgress"`) — but the UI has always *displayed* those with friendly spacing ("To Do", "In Progress"). Task 302 added `columnDisplayLabel(name: string): string` (from `client/src/app/features/columns/column.model.ts`) specifically for this: use it for anything the user *reads* (the column header text, the rename input's placeholder/current value display), but always use the raw `column.name` for anything that's *data* (grouping tasks, `taskService.create`/`move` calls, the drag-and-drop list `id`). Custom columns pass through `columnDisplayLabel` unchanged (it only has special-cased entries for the 4 defaults), so this distinction is invisible for anything the user creates themselves.

**Current `board.component.ts`** (before this task) hardcodes its columns:
```ts
interface ColumnDefinition { id: BoardColumn; label: string; hint: string; }

export class BoardComponent implements OnInit {
  readonly columns: ColumnDefinition[] = [
    { id: 'Backlog', label: 'Backlog', hint: 'Ideas & someday' },
    { id: 'ToDo', label: 'To Do', hint: 'This week' },
    { id: 'InProgress', label: 'In Progress', hint: 'Focus now' },
    { id: 'Done', label: 'Done', hint: 'Nice work' },
  ];
  readonly columnIds: BoardColumn[] = this.columns.map((c) => c.id);
  readonly quickAddTitles = signal<Record<BoardColumn, string>>({ Backlog: '', ToDo: '', InProgress: '', Done: '' });
  private readonly tasksByColumn = computed<Record<BoardColumn, Task[]>>(() => { /* groups filteredTasks() by task.column */ });
  // ...projectNameFor, labelsFor, quickAddTitleFor, setQuickAddTitle, onQuickAddSubmit,
  // onQuickAddKeydown, cancelQuickAdd, openEditor, onDrop — all unchanged in spirit,
  // just re-keyed off dynamic columns instead of the hardcoded 4.
}
```
The template (`board.component.html`) renders `@for (column of columns; ...)`, each with a header (title + live task count + hint), a `cdkDropList`-based card area (existing drag-and-drop between columns, untouched by this task), and a quick-add textarea (Enter submits, Shift+Enter newlines, Escape cancels — already correct, keep as-is).

`TaskService` (`client/src/app/features/tasks/task.service.ts`, unchanged by this task) already has `tasks: Signal<Task[]>`, `load(projectId?)`, `create(title, column?)`, `move(id, column, position)` — `column` parameters are `BoardColumn` which is now just `string` (task 103), so passing any column name (default or custom) already works with zero further changes to `TaskService`.

## Interfaces you must conform to

No new public interface — this task consumes `ColumnService`'s already-fixed public surface and keeps `BoardComponent`'s existing inputs/selector unchanged.

**Drag-to-reorder mechanism** (for reference — Angular CDK's drag-drop module natively supports this exact "board of lists" nesting pattern, used by Trello-style UIs): the row of columns becomes its own `cdkDropList` (columns are the draggable items, reordered via a `cdkDragHandle` restricted to each column's header, so users can't accidentally start a column-drag by grabbing a card), while each column's *card* list keeps its own existing, separate `cdkDropList`/`cdkDropListGroup` wiring for cards, nested inside. These two drag axes (reordering columns vs. moving cards between columns) do not interfere with each other because CDK's list/group wiring is scoped to direct parent-child drag relationships, not the whole page.

## What to do

1. In `board.component.ts`:
   - Remove the hardcoded `ColumnDefinition` interface and `columns: ColumnDefinition[]` array.
   - Inject `ColumnService`; call `columnService.load()` in `ngOnInit` alongside the existing `projectService.load()`/`labelService.load()`.
   - Change `tasksByColumn` to group `filteredTasks()` by `task.column` (a string, matched against each `Column.name` from `columnService.columns()`, not against `Column.id`).
   - `tasksFor(columnName: string): Task[]` — same behavior as before, just keyed by name.
   - Re-key `quickAddTitles` by each column's **numeric `id`** (`Record<number, string>`), not by name — this way an in-progress quick-add draft survives a column rename (which only changes the name, not the id). When submitting a quick-add for a given column id, look up that column's *current* name from `columnService.columns()` and pass it to `taskService.create(title, currentName)`.
   - Add an "add column" draft signal (e.g. `newColumnName = signal('')`) and an `addColumn()` method calling `columnService.create(name)`, clearing the draft on success.
   - Add per-column rename state (which column id, if any, is being renamed, and its in-progress name draft) and a `renameColumn(id)` method calling `columnService.rename(id, name)`, then reloading tasks afterward (same reason and same call as the delete case below) so cards that were in that column keep appearing correctly under its new name.
   - Add per-column delete-confirm state (which column id, if any, is in a delete-confirmation step) and a `confirmDeleteColumn(id)` method calling `columnService.delete(id)`, then — critically — reloading tasks afterward (`taskService.load(filterState.selectedProjectId() ?? undefined)`), because the backend has already moved that column's tasks to Backlog server-side and the frontend's `TaskService.tasks()` signal needs a fresh fetch to reflect that (the same reload-after-mutation pattern already used in `onDrop`'s `finally` block).
   - Add an `onColumnDrop(event: CdkDragDrop<Column[]>)` handler: on drop, compute the new full ordered list of column ids and call `columnService.reorder(orderedIds)`.
2. In `board.component.html`:
   - Iterate `@for (column of columnService.columns(); track column.id)` instead of the hardcoded array.
   - Wrap the column row in a `cdkDropList` (new, for column reordering) with `(cdkDropListDropped)="onColumnDrop($event)"`; make each column `cdkDrag` with `[cdkDragData]="column"` and a `cdkDragHandle` scoped to just the header element (so dragging a card inside the column body does not also try to drag the whole column).
   - Keep the existing per-column card `cdkDropList`/`cdkDropListGroup` wiring exactly as it is today, just keyed by `column.name` instead of the old literal id.
   - Header: show `columnDisplayLabel(column.name)` (imported from `column.model.ts`), the live task count (`tasksFor(column.name).length`), and `column.hint` (may be `null` for custom columns — render nothing when it is, rather than an empty line).
   - For columns where `column.isDefault` is `false`: show a small overflow menu (e.g. `mat-menu` behind an icon button) with Rename and Delete options. Rename swaps the header into an editable text input (prefilled with `column.name` — a custom column's name and its display label are always identical, so no need for `columnDisplayLabel` here) + Save/Cancel. Delete shows a confirm step ("Delete '{name}'? Tasks in it will move to Backlog." + Yes/Cancel) before actually calling delete — mirroring the two-step confirm pattern already used for task deletion in `TaskDetailDrawerComponent`.
   - For columns where `column.isDefault` is `true`: show no overflow menu at all (their name/existence is protected — no rename or delete affordance should even be visible).
   - Add a "+ Add column" ghost column at the end of the row: a dashed-outline placeholder containing a name input and a confirm button, calling `addColumn()`.
3. Style (`board.component.scss`): style the new column drag handle (cursor affordance on the header), the overflow menu trigger, the rename input, the delete-confirm mini-dialog, and the "+ Add column" ghost column — consistent with the existing cream/coral design tokens (`--surface`, `--border`, `--ink-2`, `--accent`, `--radius`) already used throughout this file.

## Acceptance criteria

- [ ] The board renders columns from `columnService.columns()` (verify: the 4 defaults still appear, in their seeded order) instead of a hardcoded array.
- [ ] Each column header shows its live task count and hint (default columns show their seeded hint; a newly-created custom column, which has `hint: null`, shows no hint line).
- [ ] The default columns' headers still read "Backlog", "To Do", "In Progress", "Done" (friendly, spaced labels via `columnDisplayLabel`) — not the raw wire-format names "ToDo"/"InProgress".
- [ ] Using "+ Add column" with a name creates a new column via `columnService.create()`, and it appears at the end of the row with a working quick-add and card drop target, identical in behavior to the defaults.
- [ ] Default columns (Backlog/To Do/In Progress/Done) show no rename/delete affordance.
- [ ] A custom column's overflow menu offers Rename and Delete; renaming it updates its header text immediately. Because `tasksFor` matches tasks to columns by name, and a rename changes that name out from under any already-loaded tasks, `renameColumn()` must also reload tasks afterward (same `taskService.load(...)` call used after delete) so the cards that were in that column keep appearing under its new name rather than vanishing from view.
- [ ] Deleting a custom column that has at least one task in it shows a confirm step first; confirming calls `columnService.delete()`, then reloads tasks, and the task that was in the deleted column now appears under Backlog.
- [ ] Dragging a column header to a new position calls `columnService.reorder()` with the full new id order, and the column row re-renders in that order; existing card drag-and-drop (within and between columns) continues to work exactly as before.
- [ ] `ng build` succeeds; manually exercising the board (`ng serve`) shows no console errors through add/rename/delete/reorder/quick-add/card-drag.

## Out of scope

- Do not modify `TaskCardComponent`, `TaskDetailDrawerComponent`, `TaskService`, or `ColumnService` internals — only consume their existing public interfaces.
- Do not modify `client/src/app/features/dashboard/` — that's task 403, in this same wave but a different file.
- Do not add column-level color/icon customization — not requested, columns are text-only (name + optional hint).
