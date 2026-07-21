# PRD: Board Customization (Label Management & Custom Columns)

## 1. Overview

The Sprout redesign shipped two deliberately fixed catalogs: a set of 7 labels (design/research/writing/bug/chore/health/learning) and a fixed 4-column board (Backlog/To Do/In Progress/Done). Both were explicit "keep it simple for v1" calls in the original Sprout PRD's Open Questions section — but real usage has shown both to be too rigid: the user wants to tag tasks with labels the built-in 7 don't cover, and wants to represent workflow stages (e.g. "Review", "Blocked") the four defaults don't capture.

This PRD covers two related customization features, resolved together in the same design conversation: **full label management** (create/rename/delete/recolor, replacing the current read-only catalog) and **custom board columns** (add/rename/delete/reorder columns beyond the four defaults, which remain protected).

## 2. Goals

- Let the user manage the label catalog directly: create new labels, rename or recolor any label (built-in or custom), and delete labels they no longer need.
- Let the user extend the board's shape: add new columns anywhere in the row, reorder any column (default or custom) by dragging its header, and rename or delete any *custom* column.
- Keep both features strictly additive: the 7 built-in labels and 4 built-in columns keep working exactly as they do today; nothing already built (subtasks, comments, dashboard aggregation, due-date badges, etc.) may regress.

## 3. Non-Goals

- Free-form/custom hex colors for labels — tone stays constrained to the existing 7 named tones (coral/amber/teal/violet/blue/rose/slate).
- Reordering labels (only create/rename/delete/recolor were requested; only columns need a reorder interaction).
- Renaming or deleting the four default columns (Backlog/To Do/In Progress/Done) — their names and existence are protected, only their position among all columns can change.
- Per-project columns or labels — both stay global/app-wide, consistent with this app's single-board, no-multi-workspace architecture.
- Column-level automation (e.g. auto-move on a schedule, WIP limits) — not requested.
- Bulk import/export of labels or columns.
- Undo after deleting a label or column — a confirmation step (matching the app's existing task-delete pattern) is the only safety net.

## 4. Target Users & Use Cases

Same single local user as the rest of the app (no multi-user/auth — unchanged from prior PRDs). New use cases on top of the existing ones:

- Tailoring the label vocabulary to actual work instead of being limited to the shipped 7 (e.g. adding "Urgent", "Waiting on client").
- Extending the board beyond the generic 4-stage flow to match a real process (e.g. inserting a "Review" column between In Progress and Done, or adding a "Blocked" parking column).

## 5. User Stories

- As the user, I want to create a new label with a name and a color so I can categorize tasks the built-in 7 labels don't cover.
- As the user, I want to rename or recolor any label — built-in or one I created — so my label list stays accurate as my needs change.
- As the user, I want to delete a label I no longer need, without deleting the tasks it was attached to.
- As the user, I want to add a new column to the board so I can represent a workflow stage the four defaults don't capture.
- As the user, I want to drag any column (default or custom) to reorder it, so the board's left-to-right order matches how work actually flows for me.
- As the user, I want to rename or delete a column I added, with its tasks automatically moved to Backlog on delete, so I never lose track of work or have to manually empty a column first.

## 6. Functional Requirements

**Labels**

1. FR-1: The Settings panel must show a new "Labels" section listing every existing label (the 7 built-in ones and any user-created ones), each showing its name and tone swatch.
2. FR-2: The Labels section must let the user create a new label: a required, non-empty name and a tone chosen from the existing 7 tones via swatches — no free-form color input.
3. FR-3: The Labels section must let the user rename any label, built-in or custom, in place.
4. FR-4: The Labels section must let the user change any label's tone (recolor) via the same swatch picker used for creation.
5. FR-5: The Labels section must let the user delete any label, built-in or custom. Deletion requires a confirmation step (matching the existing task-delete two-step confirm pattern) and removes the label from every task currently tagged with it, without deleting those tasks.
6. FR-6: Every existing label consumer (task card chips, the drawer's label picker, task detail) must reflect a create/rename/recolor/delete immediately, with no stale label data shown anywhere in the app after a change.

**Board columns**

7. FR-7: The board must show a "+ Add column" affordance at the end of the column row; using it prompts for a name and appends a new column.
8. FR-8: New columns must support the same behavior as the four defaults: quick-add, a live task count in the header, card drop targets, and position tracking for the cards within them.
9. FR-9: The user must be able to reorder any column — default or custom — by dragging its header, reusing the same drag-and-drop interaction model already used for dragging cards between columns.
10. FR-10: The user must be able to rename any *custom* (non-default) column.
11. FR-11: The user must be able to delete any *custom* (non-default) column. Deletion requires a confirmation step; on confirmation, every task currently in that column is automatically moved to Backlog (appended to the end of Backlog's task order).
12. FR-12: Backlog, To Do, In Progress, and Done are protected: their names cannot be edited and they cannot be deleted. Their position relative to other columns (including newly-added custom ones) can still change via the drag-to-reorder interaction in FR-9.
13. FR-13: Custom column headers must show a rename/delete affordance (e.g. an overflow menu); default column headers must not show this menu at all, visually communicating their protected status.
14. FR-14: The Dashboard's stat cards, "Today's focus" list, and weekly progress ring must continue to function correctly regardless of how many custom columns exist. Specifically: "In progress" continues to mean the protected In Progress column, "Completed" and the weekly-progress ring continue to mean the protected Done column, and "open"/active tasks continue to mean "not in Done" — a task sitting in a custom column (e.g. "Review") between In Progress and Done still counts as open/active, not completed.

## 7. Non-Functional Requirements

- **Data integrity**: deleting a label or column must never leave an orphaned reference (join-table row, dangling foreign key) — enforced at the database level (cascade behavior), not only in application code.
- **Migration safety**: converting the board's fixed `BoardColumn` enum into a database-backed, user-editable entity must preserve every existing task's current column assignment with zero data loss, verified against the existing local dev database before this ships.
- **Visual consistency**: labels and columns the user creates must use the same visual language (tone colors, card/chip styling, corner-radius/shadow tokens) as the built-in ones — no separate "custom item" visual treatment.
- **Performance**: label CRUD and column reorder are local, single-user operations with no specific latency budget beyond feeling immediate — consistent with every other NFR in this app.

## 8. UX / Design Notes

- **Labels** are managed entirely within the Settings panel (opened via the topbar's gear icon), as a new section alongside Theme/Density/Accent/Roundness. Each row shows the tone swatch + name, with inline rename (click to edit) and a delete icon (behind a confirm step). A "+ New label" control at the bottom of the list opens the same tone-swatch picker plus a name input — mirroring the sidebar's existing "+ New project" inline-form pattern already shipped.
- **Columns** are managed entirely on the board itself, not in Settings — they're a board-layout concern, not a global preference. A "+ Add column" ghost column sits at the end of the row (visually similar to a real column but dashed/muted until named). Column headers double as drag handles for reordering (a new column-level `cdkDropList`, distinct from the existing per-column card `cdkDropList`s). Custom column headers get a small overflow menu (rename / delete); default column headers show no such menu.
- **Empty states**: an empty custom column shows the same "Add a task" quick-add affordance as any other column (existing FR-15 from the original Sprout PRD) — no special empty-state copy needed, since a custom column is visually and functionally identical to a default one except for its rename/delete menu.

## 9. Technical Considerations

**Labels** (`server/Entities/Label.cs`, `server/Controllers/LabelsController.cs`, `server/Dtos/LabelDto.cs`, `client/src/app/features/labels/`):

- The `Label` entity already has the right shape (`Id: string, Name: string, Tone: string`) — no entity change needed.
- Add three endpoints to `LabelsController`: `POST /api/labels` (create — server generates `Id` as a slug of `Name`, de-duplicated on collision), `PUT /api/labels/{id}` (rename + recolor in one call), `DELETE /api/labels/{id}` (delete). The existing `LabelTaskItem` many-to-many join table already cascade-deletes on the `Labels` side (set up in the original `AddSproutSchema` migration), so no new cascade logic is needed for FR-5/FR-6.
- `Tone` must be validated server-side against the 7 known tone keywords (coral/amber/teal/violet/blue/rose/slate) — reject anything else with a 400. The frontend swatch picker is the only intended way to set it, but the API must not trust that blindly.
- Frontend: extend `LabelService` (`client/src/app/features/labels/label.service.ts`) with `create(name, tone)`, `update(id, name, tone)`, `delete(id)`. Add the management UI to `SettingsPanelComponent` (or a new child component it composes), consuming the extended service.

**Board columns** (`server/Entities/Enums.cs`, `server/Entities/TaskItem.cs`, `server/Services/TaskPositionService.cs`, `server/Controllers/TasksController.cs`, plus every frontend file referencing `BoardColumn`):

- Replace the `BoardColumn` enum with a new `Column` entity: `{ Id: int, Name: string, Hint: string?, Position: int, IsDefault: bool }`. Seed the 4 defaults (Backlog, To Do, In Progress, Done, in that `Position` order) with `IsDefault: true` and their existing hint text ("Ideas & someday" / "This week" / "Focus now" / "Nice work", already shipped in the board's current column headers).
- `TaskItem.Column` (currently the `BoardColumn` enum) becomes `TaskItem.ColumnId` (int FK) plus a `Column` navigation property. This needs one EF Core migration that: creates the `Columns` table, seeds the 4 defaults, adds `TaskItem.ColumnId`, backfills every existing task's `ColumnId` from its current enum value, then drops the old enum-backed column. This is the single riskiest step in this PRD and should be verified against the existing local dev database before merging.
- `TaskPositionService` (`server/Services/TaskPositionService.cs`) already treats its column parameter as an opaque comparable value (`t.Column == column`, never switching on specific enum members) — changing its signature from `BoardColumn` to `int columnId` should be a mechanical signature change, not a logic rewrite.
- New `ColumnsController`: `GET /api/columns` (all, ordered by `Position`), `POST /api/columns` (create, appended at the end), `PUT /api/columns/{id}` (rename — 400 if `IsDefault`), `DELETE /api/columns/{id}` (400 if `IsDefault`; otherwise re-point every task currently in it to the Backlog column id, appended to the end of Backlog's position order, then delete the column), `PATCH /api/columns/reorder` (accepts an ordered list of column ids and rewrites every column's `Position` — the same reindexing pattern already proven by `TaskPositionService`'s move logic, just applied to columns instead of tasks).
- Column names must be unique (enforced server-side) — this keeps the wire format for `TaskDto.Column`/`CreateTaskRequest.Column`/`UpdateTaskRequest`/`MoveTaskRequest.Column` a simple string (the column's name) rather than forcing a wider breaking change to switch every DTO to a numeric column id.
- Frontend `BoardColumn` type (`client/src/app/features/tasks/task.model.ts`), currently the literal union `'Backlog' | 'ToDo' | 'InProgress' | 'Done'`, becomes a plain `string` (the column's current name, now dynamic) — every place that currently assumes the fixed 4-item union at compile time needs to instead read from a loaded column list at runtime:
  - `board.component.ts`: the hardcoded `columns` array is replaced by a new `ColumnService.columns()` signal; add a column-header `cdkDropList` (new, alongside the existing per-column card `cdkDropList`s) for reordering, plus the "+ Add column" affordance calling `ColumnService.create(name)`.
  - `task-detail-drawer.component.ts`: the hardcoded 4-item `columnOptions` array becomes derived from `ColumnService.columns()`.
  - `dashboard.component.ts`: the `doing`/`done`/`active` computed signals currently compare `task.column` against the string literals `'InProgress'`/`'Done'`. Since those two names are protected and stable (FR-12) but are no longer compile-time literals once `BoardColumn` becomes `string`, these become ordinary runtime string comparisons against the known protected column names — called out explicitly here so it isn't missed as a "just works" assumption during implementation.
  - New `client/src/app/features/columns/column.model.ts` + `column.service.ts`: `Column { id: number; name: string; hint: string | null; position: number; isDefault: boolean }`, `ColumnService { columns: Signal<Column[]>; load(); create(name): Promise<Column>; rename(id, name): Promise<Column>; delete(id): Promise<void>; reorder(orderedIds: number[]): Promise<Column[]> }`.

## 10. Success Metrics

Same qualitative framing as the rest of this app: a personal tool with no external adoption metrics. Success is the user actually using custom labels and columns instead of working around the fixed sets, with no regression in existing board, dashboard, or drawer functionality.

## 11. Milestones / Rollout

These two features touch almost entirely different files and can be sequenced or parallelized independently:

1. **Labels management** — smaller and self-contained (Settings panel UI + three new `LabelsController` endpoints). No schema-breaking change; the `Label` entity itself is unchanged.
2. **Custom board columns** — larger: the enum-to-entity schema migration must land first, then the new `ColumnsController`, then the frontend rewrite of every `BoardColumn`-literal touchpoint, then the new add/reorder/rename/delete UI on the board itself.

## 12. Open Questions / Assumptions

- **Default-column reordering**: confirmed columns can be reordered via drag, including moving a custom column between two defaults (e.g. "Review" between In Progress and Done) — this PRD assumes the defaults' *position* is not itself frozen, only their name and existence (FR-12), since freezing position too would make that motivating example impossible. Worth a final confirmation before this is broken into kanban tasks.
- **Column name uniqueness**: assumed necessary to keep the API's wire format a simple string rather than forcing every DTO to switch to numeric column ids — not explicitly discussed during scoping.
- **Label id/slug generation**: assumed the server generates a label's `Id` as a slug of its name, de-duplicating on collision (e.g. `bug`, `bug-2`) — an implementation detail, not raised during scoping.
- **Column-deletion confirmation**: assumed a lightweight confirm dialog (matching the app's existing task-delete two-step pattern) gates *deleting the column itself*, separate from the already-decided "auto-move its tasks to Backlog" behavior (FR-11), which covers what happens to the tasks, not whether the column deletion itself needs a confirm step.
