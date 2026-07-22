---
id: 402
title: Task detail drawer — dynamic Status segmented control
status: done
wave: 4
depends_on: [302, 103]
priority: medium
estimate: S
files:
  - client/src/app/features/tasks/task-detail-drawer.component.ts
  - client/src/app/features/tasks/task-detail-drawer.component.html
prd_refs: [FR-7, FR-12]
agent_ready: true
---

# 402 – Task detail drawer — dynamic Status segmented control

## Context (self-contained)

The task detail drawer's "Status" segmented control lets the user move a task between columns by clicking a segment — today it's hardcoded to the 4 default columns. Since the board now supports user-defined columns (a prior task, 302, added a `ColumnService`), this control needs to offer whatever columns currently exist, not just the 4 defaults.

**`ColumnService`** (`client/src/app/features/columns/column.service.ts`, already exists):
```ts
export interface Column { id: number; name: string; hint: string | null; position: number; isDefault: boolean; }
export class ColumnService {
  readonly columns: Signal<Column[]>;   // ordered by position
  load(): void;
  // create/rename/delete/reorder also exist, not used by this task
}
```
Also from the same task, `client/src/app/features/columns/column.model.ts` exports `columnDisplayLabel(name: string): string`, which maps the 4 default columns' machine-form names (`"ToDo"`, `"InProgress"`) to their friendly display labels ("To Do", "In Progress") and passes any other name through unchanged — use this for anything the user *reads*, but keep using the raw column `name` for the actual value sent to `TaskService`.

**Current drawer code** (`client/src/app/features/tasks/task-detail-drawer.component.ts`, before this task):
```ts
interface ColumnOption { value: BoardColumn; label: string; }

export class TaskDetailDrawerComponent implements OnInit {
  readonly columnOptions: ColumnOption[] = [
    { value: 'Backlog', label: 'Backlog' },
    { value: 'ToDo', label: 'To Do' },
    { value: 'InProgress', label: 'In Progress' },
    { value: 'Done', label: 'Done' },
  ];
  // ...priorityOptions, detail signal, onStatusChange (calls taskService.move), etc. — all unchanged
}
```
Template (`task-detail-drawer.component.html`) renders `columnOptions` inside a `mat-button-toggle-group` bound to `detail.column`, calling `onStatusChange($event)` on change — this behavior (immediate-apply, no separate Save step) is unaffected by this task; only where the list of options comes from changes.

## Interfaces you must conform to

No new public interface — `TaskDetailDrawerComponent`'s existing inputs (`TaskDetailDrawerData`), outputs, and all other behavior (batched Save for title/description/due/labels/project, immediate-apply Priority control, delete confirmation, close) stay exactly as they are. Only the Status control's option source changes.

## What to do

1. In `task-detail-drawer.component.ts`: remove the hardcoded `columnOptions: ColumnOption[]` array and the `ColumnOption` interface. Inject `ColumnService`; call `columnService.load()` in `ngOnInit` alongside the existing `labelService.load()`/`projectService.load()` calls. Add a computed property (e.g. `readonly columnOptions = computed(() => this.columnService.columns().map(c => ({ value: c.name, label: columnDisplayLabel(c.name) })))`) that derives the same `{ value, label }` shape the template already expects, sourced from `columnService.columns()` instead of a fixed array.
2. In `task-detail-drawer.component.html`: no structural change needed if the computed property above preserves the same `{ value, label }` shape the `mat-button-toggle-group`'s `@for` loop already iterates — just confirm the template reads `columnOptions()` (a signal/computed call) rather than a plain array, since the field is no longer a static property. Update the template call site to match if it changes from a plain array reference to a computed signal invocation.

## Acceptance criteria

- [x] The Status segmented control shows one segment per column currently returned by `ColumnService.columns()`, including any custom columns created via the board — not just the 4 defaults.
- [x] The 4 default columns' segments read "Backlog", "To Do", "In Progress", "Done" (friendly labels via `columnDisplayLabel`), not raw wire names.
- [x] Clicking a segment still immediately calls `TaskService.move` with that column's raw `name` (not its display label, and not its numeric `Column.id`) — no Save click needed, exactly as before.
- [x] All of the drawer's other existing behavior (Priority immediate-apply, batched Save, delete confirmation, close, right-anchored panel styling) is unaffected — this task changes nothing else.
- [x] `ng build` succeeds.

## Out of scope

- Do not modify the Priority control, the batched-Save fields, delete confirmation, or any other part of the drawer's behavior.
- Do not modify `SubtaskListComponent` or `CommentFeedComponent` — unaffected.
- Do not modify `client/src/app/features/board/` — that's task 401, a different file, in this same wave.
