---
id: 102
title: Column entity + migration + TaskPositionService/TasksController/DTO updates
status: in-progress
wave: 1
depends_on: []
priority: high
estimate: M
files:
  - server/Entities/Column.cs
  - server/Entities/Enums.cs
  - server/Entities/TaskItem.cs
  - server/Data/AppDbContext.cs
  - server/Migrations/**
  - server/Services/TaskPositionService.cs
  - server/Controllers/TasksController.cs
  - server/Dtos/CreateTaskRequest.cs
  - server/Dtos/MoveTaskRequest.cs
prd_refs: [FR-12, FR-14, "Technical Considerations"]
agent_ready: true
---

# 102 – Column entity + migration + TaskPositionService/TasksController/DTO updates

## Context (self-contained)

We are converting the Kanban board's fixed, compile-time `BoardColumn` enum into a real, user-editable database entity, so later tasks can let the user add/rename/delete/reorder columns beyond the four built-in ones (Backlog, To Do, In Progress, Done). This is the ONE foundational, deliberately large task for this whole effort — larger than a typical task in this board, because unlike a purely additive schema change, **replacing an existing field's type is inherently breaking**: every file that currently references `TaskItem.Column` as a `BoardColumn` enum stops compiling the moment the entity changes. Rather than leave the build red for other tasks to inherit half-finished, this task owns the *entire* backend blast radius in one place. Two sibling tasks (101, Labels API; 103, frontend type loosening) are running in parallel right now — they touch entirely different files, no coordination needed.

**Current state (do not recreate what already works, only change what's specified):**

```csharp
// server/Entities/Enums.cs
public enum BoardColumn { Backlog, ToDo, InProgress, Done }
public enum Priority { Low, Medium, High }

// server/Entities/TaskItem.cs
public class TaskItem {
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int? ProjectId { get; set; }
    public Project? Project { get; set; }
    public Priority? Priority { get; set; }
    public required BoardColumn Column { get; set; }
    public required int Position { get; set; }
    public DateOnly? DueDate { get; set; }
    public ICollection<Label> Labels { get; set; } = new List<Label>();
}
```

`Column` is currently stored in Postgres as a plain `integer` (confirmed in the original `InitialCreate` migration), with the enum's underlying values `Backlog=0, ToDo=1, InProgress=2, Done=3`. This exact int-to-name mapping is what your migration's data backfill must preserve.

`TasksController` (`server/Controllers/TasksController.cs`) currently has working `GET /api/tasks`, `GET /api/tasks/{id}`, `POST /api/tasks`, `PUT /api/tasks/{id}`, `DELETE /api/tasks/{id}`, `PATCH /api/tasks/{id}/move`, plus a `MapToDto`/`MapToDetailDto` pair, all of which currently read/write `task.Column` as the enum. `server/Controllers/TasksController.Subtasks.cs` and `server/Controllers/TasksController.Comments.cs` (separate partial-class files, untouched by this task) never reference `Column` at all — no changes needed there.

`server/Services/TaskPositionService.cs` currently has `MoveAsync(AppDbContext db, int taskId, BoardColumn targetColumn, int targetPosition)` and `RemoveAsync(AppDbContext db, TaskItem task)`. Its logic already treats the column parameter as an opaque comparable value (`t.Column == column`), never switching on specific enum members — so converting it to use an `int` column id is a mechanical signature/comparison change, not a logic rewrite.

`TaskDto`/`TaskDetailDto` (`server/Dtos/TaskDto.cs`, `server/Dtos/TaskDetailDto.cs`, **not in your file list, do not touch them**) both have a `string Column` field already — their *shape* does not change, only what populates it (today: `task.Column.ToString()`; after this task: `task.Column!.Name`, the related `Column` entity's name). Since the field was already typed `string`, no DTO record signature changes at all.

Two tasks in the next wave depend on this one: task 201 (a brand-new `ColumnsController` for column CRUD, needs the `Column` entity/table to exist) and task 202 (frontend Labels service — independent of this task, but scheduled in the same wave for board-width reasons).

## Interfaces you must conform to

**`Column`** (`server/Entities/Column.cs`, new):
```csharp
public class Column
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Hint { get; set; }
    public required int Position { get; set; }
    public required bool IsDefault { get; set; }
}
```

**`Enums.cs`** — remove `BoardColumn` entirely. Keep `Priority` unchanged.

**`TaskItem`** — replace the `Column` property with an `int` FK + navigation, every other field unchanged:
```csharp
public required int ColumnId { get; set; }
public Column? Column { get; set; }
```

**`AppDbContext`** additions:
- `DbSet<Column> Columns => Set<Column>();`
- `modelBuilder.Entity<TaskItem>().HasOne(t => t.Column).WithMany().HasForeignKey(t => t.ColumnId).OnDelete(DeleteBehavior.Restrict);` — `Restrict`, not `Cascade`: the database must never silently let a column disappear out from under tasks that still reference it. A later task (201) is responsible for moving a custom column's tasks to Backlog at the *application* level before deleting the column row; `Restrict` is the safety net if that's ever missed.
- Seed exactly these 4 rows via `HasData`, preserving the **exact same name strings** the old enum's `.ToString()` produced, so the JSON wire format for existing default columns (`"column": "ToDo"`, etc.) is unchanged for any existing consumer:
  - `Id=1, Name="Backlog", Hint="Ideas & someday", Position=0, IsDefault=true`
  - `Id=2, Name="ToDo", Hint="This week", Position=1, IsDefault=true`
  - `Id=3, Name="InProgress", Hint="Focus now", Position=2, IsDefault=true`
  - `Id=4, Name="Done", Hint="Nice work", Position=3, IsDefault=true`

**`TaskPositionService`** — change both methods' column parameter from `BoardColumn` to `int`:
```csharp
public async Task<TaskItem?> MoveAsync(AppDbContext db, int taskId, int targetColumnId, int targetPosition)
public async Task RemoveAsync(AppDbContext db, TaskItem task)   // unchanged signature; internally now compares task.ColumnId instead of task.Column
```

**`TasksController`** — `Column`-related behavior changes (routes/DTO shapes unchanged, only the mapping/lookup logic):
- `GetTasks`: order by the column's display position, not the raw FK id (`Include(t => t.Column)` then `.OrderBy(t => t.Column!.Position).ThenBy(t => t.Position)`) — a custom column inserted between defaults will have an id that doesn't sort correctly on its own.
- `MapToDto`/`MapToDetailDto`: use `task.Column!.Name` instead of `task.Column.ToString()`.
- `CreateTask`: `request.Column` (now `string?`) is resolved to a `Column` entity by exact name match; if null, default to the column named `"ToDo"`. Return `400` if a non-null `Column` name doesn't match any existing column.
- `MoveTask`: `request.Column` (now `string`, non-nullable) is resolved to a `Column` entity by exact name match (`400` if not found), and its `Id` passed to `TaskPositionService.MoveAsync`.
- `UpdateTask`: unchanged — it never touched column/position before and still doesn't.

**`CreateTaskRequest`** (`server/Dtos/CreateTaskRequest.cs`) — change `Column`'s type:
```csharp
public class CreateTaskRequest
{
    [Required, MinLength(1)]
    public required string Title { get; set; }
    public string? Column { get; set; }   // was: BoardColumn? Column
}
```

**`MoveTaskRequest`** (`server/Dtos/MoveTaskRequest.cs`) — change `Column`'s type:
```csharp
public class MoveTaskRequest
{
    public required string Column { get; set; }   // was: BoardColumn Column
    public required int Position { get; set; }
}
```

## What to do

1. Create `server/Entities/Column.cs` exactly as specified.
2. Update `server/Entities/Enums.cs`: remove `BoardColumn`, keep `Priority`.
3. Update `server/Entities/TaskItem.cs`: replace `Column` (enum) with `ColumnId` (int) + `Column` (nullable navigation).
4. Update `server/Data/AppDbContext.cs`: add `DbSet<Column> Columns`, the FK config (`Restrict`), and the 4-row seed, all exactly as specified.
5. Run `dotnet ef migrations add AddColumnsEntity` from `server/`, then **manually edit the generated migration's `Up()`** to backfill correctly (EF Core's scaffold will likely try to add `ColumnId` as non-nullable with a placeholder default, which is wrong here): add `ColumnId` as nullable first, run `migrationBuilder.Sql("UPDATE \"Tasks\" SET \"ColumnId\" = \"Column\" + 1;")` to map the old enum ints (0/1/2/3) to the new seeded `Column.Id` values (1/2/3/4), then alter `ColumnId` to non-nullable, then drop the old `Column` column — in that exact order (Postgres rejects a `NOT NULL` column added to a populated table without a backfilled value first).
6. Update `server/Services/TaskPositionService.cs`: change both methods' signatures/comparisons from `BoardColumn` to `int columnId`/`task.ColumnId` as specified.
7. Update `server/Controllers/TasksController.cs`: apply the `GetTasks`/`MapToDto`/`MapToDetailDto`/`CreateTask`/`MoveTask` changes described above. Leave `DeleteTask` and `UpdateTask` untouched apart from whatever the compiler forces (they shouldn't need logic changes, only that everything still compiles against the new `TaskItem` shape).
8. Update `server/Dtos/CreateTaskRequest.cs` and `server/Dtos/MoveTaskRequest.cs` to the new `Column: string`/`string?` shapes.
9. Verify: with Postgres running (`docker compose up -d` from the repo root), run `dotnet run` from `server/` and confirm the migration applies cleanly against the existing dev database with no data loss, and the existing Tasks API endpoints behave exactly as before for the 4 default columns.

## Acceptance criteria

- [ ] `Column` entity exists exactly as specified; `BoardColumn` no longer exists anywhere in the codebase.
- [ ] `dotnet build` succeeds with zero errors.
- [ ] With Postgres running, `dotnet run` auto-applies the migration with no errors.
- [ ] `SELECT * FROM "Columns"` (via `docker exec kanban-postgres psql -U kanban -d kanban -c '...'`) shows exactly the 4 seeded rows with correct `Name`/`Hint`/`Position`/`IsDefault` values.
- [ ] For a task that existed in the database before this migration ran, its post-migration `ColumnId` correctly corresponds to its pre-migration `Column` enum value (0→1, 1→2, 2→3, 3→4) — verify by creating a task in a known column via the existing API *before* applying this migration, noting its column, then confirming after migration that `GET /api/tasks/{id}` still reports the same column name.
- [ ] `GET /api/tasks` still returns `column: "Backlog"|"ToDo"|"InProgress"|"Done"` (unchanged string values) for existing tasks, correctly ordered by column display position then task position.
- [ ] `GET /api/tasks/{id}` still returns the correct `column` string.
- [ ] `POST /api/tasks` with `{ "title": "x" }` still creates in `"ToDo"` (unchanged default behavior).
- [ ] `POST /api/tasks` with `{ "title": "x", "column": "Backlog" }` still creates the task with `column: "Backlog"`.
- [ ] `POST /api/tasks` with an unknown `"column"` value (e.g. `"NotAColumn"`) returns `400`.
- [ ] `PATCH /api/tasks/{id}/move` with `{ "column": "Done", "position": 0 }` still works exactly as before (moves the task, reindexes positions in both source and destination columns).
- [ ] `PATCH /api/tasks/{id}/move` with an unknown `"column"` value returns `400`.
- [ ] `DELETE /api/tasks/{id}` still works unchanged.

## Out of scope

- Do not implement `ColumnsController`, `ColumnDto`, or any column CRUD/reorder endpoint — that's task 201, next wave, and it's the only task allowed to touch `TaskItem.Column`'s *deletion* implications (moving tasks out of a column before it's deleted).
- Do not touch `server/Dtos/TaskDto.cs`, `server/Dtos/TaskDetailDto.cs`, or `server/Dtos/UpdateTaskRequest.cs` — their shapes are unaffected by this task.
- Do not touch `server/Controllers/TasksController.Subtasks.cs` or `server/Controllers/TasksController.Comments.cs` — they never reference `Column`.
- Do not touch any frontend file.
- Do not add column reordering logic (`Position` rewriting beyond the initial 4-row seed) — that's task 201.
