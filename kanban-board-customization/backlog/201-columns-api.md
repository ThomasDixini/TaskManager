---
id: 201
title: Columns API — list, create, rename, delete, reorder
status: backlog
wave: 2
depends_on: [102]
priority: high
estimate: M
files:
  - server/Controllers/ColumnsController.cs
  - server/Dtos/ColumnDto.cs
  - server/Dtos/CreateColumnRequest.cs
  - server/Dtos/UpdateColumnRequest.cs
  - server/Dtos/ReorderColumnsRequest.cs
prd_refs: [FR-7, FR-9, FR-10, FR-11, FR-12]
agent_ready: true
---

# 201 – Columns API — list, create, rename, delete, reorder

## Context (self-contained)

We are adding a Columns API to an existing Kanban board backend (ASP.NET Core + EF Core + PostgreSQL) so the user can add, rename, delete, and reorder board columns beyond the four built-in ones (Backlog, To Do, In Progress, Done). A prior task (102, already done) replaced the old fixed `BoardColumn` enum with a real `Column` entity:

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

`AppDbContext` exposes `DbSet<Column> Columns`, seeded with exactly 4 rows (`Id=1..4`, `Name="Backlog"/"ToDo"/"InProgress"/"Done"`, `Position=0..3`, all `IsDefault=true`). `TaskItem.ColumnId` is a required `int` FK to `Column`, configured with `OnDelete(DeleteBehavior.Restrict)` — meaning the database itself will reject deleting a `Column` row while any `TaskItem` still references it. This task's delete endpoint must move tasks out of a column *before* deleting it, exactly as the PRD specifies (auto-move to Backlog), both because that's the desired product behavior and because skipping it would throw a DB-level FK violation.

The four default columns are protected per the PRD: their `Name` can never change and they can never be deleted — this task must enforce that at the API level (`400` on any attempt), not just rely on the frontend to hide the option.

## Interfaces you must conform to

Routes:
- `GET /api/columns` → `200 OK`, `ColumnDto[]`, all columns ordered by `Position` ascending.
- `POST /api/columns` with body `CreateColumnRequest { name: string }` → `201 Created`, the created `ColumnDto`. New columns are always `IsDefault: false`, `Hint: null`, appended at the end (`Position = (max existing Position) + 1`). Returns `400` if `name` case-insensitively matches an existing column's name.
- `PUT /api/columns/{id}` with body `UpdateColumnRequest { name: string }` → `200 OK`, the updated `ColumnDto` (rename only — this endpoint never touches `Position`/`IsDefault`). Returns `404` if the column doesn't exist, `400` if the column `IsDefault` (protected), `400` if `name` case-insensitively collides with a *different* existing column.
- `DELETE /api/columns/{id}` → `204 No Content`. Returns `404` if the column doesn't exist, `400` if the column `IsDefault` (protected). On success: every `TaskItem` currently in that column is re-pointed to the Backlog column (looked up by `IsDefault && Name == "Backlog"`, never hardcode its `Id`), appended to the end of Backlog's existing task `Position` order (preserving the moved tasks' relative order to each other); then the column row is deleted; then every remaining column with a `Position` greater than the deleted column's original `Position` has its `Position` decremented by 1, so column positions stay a contiguous 0-based sequence (mirroring how `TaskPositionService` already keeps task positions contiguous within a column).
- `PATCH /api/columns/reorder` with body `ReorderColumnsRequest { orderedIds: int[] }` → `200 OK`, `ColumnDto[]` (all columns, in the new order). The provided `orderedIds` must be exactly the current full set of column ids (same count, no duplicates, no unknown ids) — `400` otherwise. On success, each column's `Position` is rewritten to its index in `orderedIds` (this can reorder *any* column, including the four defaults — only their `Name`/existence is protected, not their position).

**`ColumnDto`** (`server/Dtos/ColumnDto.cs`, new):
```csharp
public record ColumnDto(int Id, string Name, string? Hint, int Position, bool IsDefault);
```

**`CreateColumnRequest`** (`server/Dtos/CreateColumnRequest.cs`, new):
```csharp
public class CreateColumnRequest
{
    [Required, MinLength(1)]
    public required string Name { get; set; }
}
```

**`UpdateColumnRequest`** (`server/Dtos/UpdateColumnRequest.cs`, new):
```csharp
public class UpdateColumnRequest
{
    [Required, MinLength(1)]
    public required string Name { get; set; }
}
```

**`ReorderColumnsRequest`** (`server/Dtos/ReorderColumnsRequest.cs`, new):
```csharp
public class ReorderColumnsRequest
{
    [Required]
    public required int[] OrderedIds { get; set; }
}
```

This exact contract is what a later task (302, frontend `ColumnService`) will consume — do not deviate from these routes/shapes.

## What to do

1. Create `server/Dtos/ColumnDto.cs`, `CreateColumnRequest.cs`, `UpdateColumnRequest.cs`, `ReorderColumnsRequest.cs` exactly as specified.
2. Create `server/Controllers/ColumnsController.cs`, a standard `[ApiController]` with route `[Route("api/[controller]")]`, injecting `AppDbContext` via constructor.
3. Implement `GET /api/columns` as specified.
4. Implement `POST /api/columns`: validate name uniqueness (case-insensitive), compute the next `Position`, create with `IsDefault: false, Hint: null`, save, return `201`.
5. Implement `PUT /api/columns/{id}`: look up (404 if missing), reject if `IsDefault` (400), validate name uniqueness against other columns (400 on collision), update `Name`, save, return `200`.
6. Implement `DELETE /api/columns/{id}`: look up (404 if missing), reject if `IsDefault` (400), look up the Backlog column by `IsDefault && Name == "Backlog"`, re-point all of the target column's tasks to Backlog (appended after Backlog's current max task position, preserving relative order), delete the column, reindex remaining columns' `Position` to close the gap, save, return `204`.
7. Implement `PATCH /api/columns/reorder`: validate the id set matches exactly (400 otherwise), rewrite each column's `Position` to its index in the request array, save, return `200` with all columns in the new order.

## Acceptance criteria

- [ ] `GET /api/columns` returns the 4 seeded defaults ordered by `Position`, each `{ id, name, hint, position, isDefault: true }`.
- [ ] `POST /api/columns` with `{ "name": "Review" }` returns `201` with `{ id, name: "Review", hint: null, position: 4, isDefault: false }` (assuming the 4 defaults occupy positions 0-3).
- [ ] `POST /api/columns` with a name that case-insensitively collides with an existing column (e.g. `"backlog"`) returns `400`.
- [ ] `PUT /api/columns/{id}` on a custom column renames it; `GET /api/columns` reflects the new name.
- [ ] `PUT /api/columns/{id}` on one of the 4 default columns (e.g. the "Done" column's id) returns `400`.
- [ ] `PUT /api/columns/{nonexistent}` returns `404`.
- [ ] `DELETE /api/columns/{id}` on a custom column that has at least one task in it (create a task via the existing Tasks API with `"column": "Review"` first) returns `204`; a subsequent `GET /api/tasks` shows that task now has `column: "Backlog"`; a subsequent `GET /api/columns` no longer includes "Review" and the remaining columns' `position` values are still a contiguous 0-based sequence.
- [ ] `DELETE /api/columns/{id}` on one of the 4 default columns returns `400`.
- [ ] `DELETE /api/columns/{nonexistent}` returns `404`.
- [ ] `PATCH /api/columns/reorder` with a full, valid reordering (e.g. swapping "InProgress" and "Done"'s positions) returns `200` with columns in the new order; `GET /api/columns` reflects the new order afterward.
- [ ] `PATCH /api/columns/reorder` with a malformed id set (missing an id, or an unknown id) returns `400`.
- [ ] `dotnet build` succeeds.

## Out of scope

- Do not touch `server/Controllers/TasksController.cs`, `server/Services/TaskPositionService.cs`, or any other file already updated by task 102 — this task only adds the new `ColumnsController` and its DTOs.
- Do not touch `server/Controllers/LabelsController.cs` or anything under `server/Dtos/*Label*` — unrelated, owned by task 101 (already done) and 202, running in parallel right now.
- Do not build any frontend UI or service — that's task 302, in a later wave.
