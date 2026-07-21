# Kanban – Board Customization (Label Management & Custom Columns)

Source PRD: [../prd-board-customization.md](../prd-board-customization.md)

## How to run this board with AI agents

- Tasks in the same wave are safe to run **in parallel** (one agent, session, or git worktree per task): they share no files.
- Start a wave only when every task in the previous wave is in `done/`.
- To work a task: move its file to `in-progress/`, set `status`, implement, verify acceptance criteria, move to `done/`.
- Each task is self-contained: give an agent just the task file.
- Task 102 is deliberately large and solo within wave 1 — unlike the original Sprout schema task (purely additive), this one *replaces* an existing field's type (`TaskItem.Column` enum → `ColumnId` FK), which is a breaking change to every direct consumer. Rather than leave the build red for a later task to inherit half-finished, 102 owns the entire backend blast radius (entity, migration, `TaskPositionService`, `TasksController`, the two affected DTOs) in one place.

## Execution plan

| Wave | Tasks | Max parallel agents | What it delivers |
|------|-------|---------------------|-------------------|
| 1 | 101, 102, 103 | 3 | Labels API (create/update/delete); `Column` entity + migration + all backend consumers updated; frontend `BoardColumn` type widened to `string` |
| 2 | 201, 202 | 2 | Columns API (list/create/rename/delete/reorder); frontend `LabelService` extended with create/update/delete |
| 3 | 301, 302 | 2 | Labels management UI (Settings panel); frontend `Column` model + service + display-label helper |
| 4 | 401, 402, 403 | 3 | Board: dynamic columns, add/rename/delete, drag-to-reorder; drawer's Status control now dynamic; Dashboard verified safe under custom columns |
| 5 | 501 | 1 | Full regression pass + new unit tests for `ColumnService`/`LabelService` |

11 tasks, 5 waves, max 3 parallel agents (waves 1 and 4).

## Shared interfaces

### Labels

- `POST /api/labels` body `{ name, tone }` → `201`, `LabelDto` (task 101). `tone` must be one of `coral`/`amber`/`teal`/`violet`/`blue`/`rose`/`slate` — `400` otherwise. Server generates `id` as a de-duplicated slug of `name`.
- `PUT /api/labels/{id}` body `{ name, tone }` → `200`, updated `LabelDto` (task 101).
- `DELETE /api/labels/{id}` → `204` (task 101). Cascades via the existing `LabelTaskItem` join table — no orphaned references.
- Frontend `LabelService` (task 202) gains `create(name, tone)`, `update(id, name, tone)`, `delete(id)` — all `Promise`-returning, all keep the `labels` signal in sync.
- Labels management lives in `SettingsPanelComponent` (task 301) — a new section alongside Theme/Density/Accent/Roundness.

### Board columns

- `Column` entity (`server/Entities/Column.cs`, task 102): `{ Id: int, Name: string, Hint: string?, Position: int, IsDefault: bool }`. Seeded with 4 rows preserving the exact machine-form names the old `BoardColumn` enum's `.ToString()` produced (`Backlog`/`ToDo`/`InProgress`/`Done`), so the wire contract (`TaskDto.column`, etc.) is unchanged for existing consumers.
- `TaskItem.ColumnId` (int FK, `OnDelete: Restrict`) replaces `TaskItem.Column` (task 102). Tasks still reference their column by **name** at the API layer (`TaskDto.column: string`, `CreateTaskRequest.column: string?`, `MoveTaskRequest.column: string`) — the numeric `Column.Id` never appears in the Tasks API, only in the Columns API below.
- `GET /api/columns` → `200`, `ColumnDto[]` ordered by `position` (task 201).
- `POST /api/columns` body `{ name }` → `201`, `ColumnDto`. Appended at the end, `isDefault: false`. `400` on a case-insensitive name collision (task 201).
- `PUT /api/columns/{id}` body `{ name }` → `200`/`400` (if `isDefault`)/`404` (task 201).
- `DELETE /api/columns/{id}` → `204`/`400` (if `isDefault`)/`404`. Moves the column's tasks to Backlog first, then deletes, then reindexes remaining columns' `position` (task 201).
- `PATCH /api/columns/reorder` body `{ orderedIds: number[] }` → `200`, `ColumnDto[]` in the new order. Can reorder *any* column, including defaults — only their name/existence is protected, not their position (task 201).
- Frontend `Column` model + `ColumnService` (`client/src/app/features/columns/`, task 302): `{ id, name, hint, position, isDefault }`; `columns: Signal<Column[]>`, `load()`, `create(name)`, `rename(id, name)`, `delete(id)`, `reorder(orderedIds)`.
- `columnDisplayLabel(name: string): string` (same file, task 302): maps the 4 defaults' machine-form names to their historical friendly display labels ("ToDo" → "To Do", etc.); passes any custom column's name through unchanged. Used by tasks 401/402 for anything the user *reads*; the raw `name` is always used for data/comparison purposes (grouping tasks, API calls, drag-drop list ids).
- Board column add/rename/delete/reorder UI lives directly on the board (task 401), not in Settings — it's a board-layout concern, not a global preference.

## File ownership map

| File | Owned by task |
|------|---------------|
| `server/Controllers/LabelsController.cs` | 101 |
| `server/Dtos/CreateLabelRequest.cs` | 101 |
| `server/Dtos/UpdateLabelRequest.cs` | 101 |
| `server/Entities/Column.cs` | 102 |
| `server/Entities/Enums.cs` | 102 |
| `server/Entities/TaskItem.cs` | 102 |
| `server/Data/AppDbContext.cs` | 102 |
| `server/Migrations/**` | 102 |
| `server/Services/TaskPositionService.cs` | 102 |
| `server/Controllers/TasksController.cs` | 102 |
| `server/Dtos/CreateTaskRequest.cs` | 102 |
| `server/Dtos/MoveTaskRequest.cs` | 102 |
| `client/src/app/features/tasks/task.model.ts` | 103 |
| `client/src/app/features/tasks/task.service.ts` | 103 |
| `server/Controllers/ColumnsController.cs` | 201 |
| `server/Dtos/ColumnDto.cs` | 201 |
| `server/Dtos/CreateColumnRequest.cs` | 201 |
| `server/Dtos/UpdateColumnRequest.cs` | 201 |
| `server/Dtos/ReorderColumnsRequest.cs` | 201 |
| `client/src/app/features/labels/label.service.ts` | 202 |
| `client/src/app/features/settings/settings-panel.component.*` | 301 |
| `client/src/app/features/columns/column.model.ts` | 302 |
| `client/src/app/features/columns/column.service.ts` | 302 |
| `client/src/app/features/board/board.component.*` | 401 |
| `client/src/app/features/tasks/task-detail-drawer.component.ts` | 402 (Status control only) |
| `client/src/app/features/tasks/task-detail-drawer.component.html` | 402 (Status control only) |
| `client/src/app/features/dashboard/dashboard.component.ts` | 403 |
| `client/src/app/features/dashboard/dashboard.component.spec.ts` | 403 |
| `client/src/app/features/columns/column.service.spec.ts` | 501 |
| `client/src/app/features/labels/label.service.spec.ts` | 501 |

## Backlog

| ID | Wave | Task | Priority | Estimate | Depends on |
|----|------|------|----------|----------|------------|
| ~~101~~ | 1 | ~~Labels API — create/update/delete endpoints~~ | high | S | – |
| ~~102~~ | 1 | ~~Column entity + migration + TaskPositionService/TasksController/DTO updates~~ | high | M | – |
| ~~103~~ | 1 | ~~Frontend `BoardColumn` type loosened to `string`~~ | medium | S | – |
| 201 | 2 | Columns API — list, create, rename, delete, reorder | high | M | 102 |
| 202 | 2 | Frontend Label service extended with create/update/delete | high | S | 101 |
| 301 | 3 | Labels management UI in the Settings panel | high | M | 202 |
| 302 | 3 | Frontend Column model + service | high | S | 201 |
| 401 | 4 | Board component — dynamic columns, add/rename/delete, drag-to-reorder | high | M | 302, 103 |
| 402 | 4 | Task detail drawer — dynamic Status segmented control | medium | S | 302, 103 |
| 403 | 4 | Dashboard — verify stats stay correct with custom columns | medium | S | 103 |
| 501 | 5 | Final integration — full regression pass + new service test coverage | high | M | 401, 402, 403 |

## In progress

| ID | Wave | Task |
|----|------|------|
| 101 | 1 | Labels API — create/update/delete endpoints |
| 102 | 1 | Column entity + migration + TaskPositionService/TasksController/DTO updates |
| 103 | 1 | Frontend `BoardColumn` type loosened to `string` |

## Done

_(empty)_
