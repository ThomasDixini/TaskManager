---
id: 102
title: Backend schema extension (Backlog column, due date, labels, subtasks, comments)
status: done
wave: 1
depends_on: []
priority: high
estimate: M
files:
  - server/Entities/Enums.cs
  - server/Entities/TaskItem.cs
  - server/Entities/Label.cs
  - server/Entities/Subtask.cs
  - server/Entities/Comment.cs
  - server/Data/AppDbContext.cs
  - server/Migrations/**
prd_refs: [FR-11, FR-16, FR-17, FR-22, FR-23, FR-25, FR-26, "Technical Considerations"]
agent_ready: true
---

# 102 – Backend schema extension (Backlog column, due date, labels, subtasks, comments)

## Context (self-contained)

We are extending the data model of an existing Kanban board app (ASP.NET Core + EF Core + PostgreSQL) to support a redesigned feature set called "Sprout": a fourth board column, due dates, multiple labels per task, subtasks, and comments. This is the ONE foundational schema task for all of this — it is deliberately large (bundling several entity/config changes) because EF Core migrations must be generated sequentially against a single schema snapshot; splitting this into parallel tasks would produce migration files that can't be reconciled. Every later backend task in this effort depends on this one.

The existing entities (do not recreate, only extend as instructed):
```csharp
// server/Entities/Enums.cs
public enum BoardColumn { ToDo, InProgress, Done }
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
}
```
`AppDbContext` (`server/Data/AppDbContext.cs`) currently has `DbSet<Project> Projects`, `DbSet<TaskItem> Tasks`, with a nullable FK from `TaskItem.ProjectId` to `Project` (`OnDelete(DeleteBehavior.SetNull)`) and a non-unique index on `(Column, Position)`. The connection string, JSON string-enum serialization, and migration-on-startup are already configured in `Program.cs` — nothing to change there for this task.

## Interfaces you must conform to

**`BoardColumn` enum** (`server/Entities/Enums.cs`) — add `Backlog` as the first value (order matters for any future default/display ordering logic, and for consistency with the PRD's column order Backlog → To Do → In Progress → Done):
```csharp
public enum BoardColumn { Backlog, ToDo, InProgress, Done }
```

**`TaskItem`** (`server/Entities/TaskItem.cs`) — add one nullable field:
```csharp
public DateOnly? DueDate { get; set; }
```
Keep every existing field unchanged. Also add a `Labels` navigation collection for the many-to-many with `Label` (see below): `public ICollection<Label> Labels { get; set; } = new List<Label>();`

**`Label`** (`server/Entities/Label.cs`, new) — string primary key (not an auto-increment int), matching a fixed catalog:
```csharp
public class Label
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public required string Tone { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
```

**`Subtask`** (`server/Entities/Subtask.cs`, new):
```csharp
public class Subtask
{
    public int Id { get; set; }
    public required int TaskItemId { get; set; }
    public TaskItem? TaskItem { get; set; }
    public required string Text { get; set; }
    public required bool Done { get; set; }
    public required int Position { get; set; }
}
```

**`Comment`** (`server/Entities/Comment.cs`, new) — no author field (comments are implicitly from the single local user):
```csharp
public class Comment
{
    public int Id { get; set; }
    public required int TaskItemId { get; set; }
    public TaskItem? TaskItem { get; set; }
    public required string Text { get; set; }
    public required DateTime CreatedAt { get; set; }
}
```

**`AppDbContext`** (`server/Data/AppDbContext.cs`) additions:
- `DbSet<Label> Labels`, `DbSet<Subtask> Subtasks`, `DbSet<Comment> Comments`.
- `TaskItem` ↔ `Label` many-to-many via EF Core's implicit skip-navigation: `modelBuilder.Entity<TaskItem>().HasMany(t => t.Labels).WithMany(l => l.Tasks);` — do NOT create an explicit join entity class; let EF Core generate the join table.
- `Subtask.TaskItemId` → `TaskItem.Id`, required FK, `OnDelete(DeleteBehavior.Cascade)` (deleting a task deletes its subtasks).
- `Comment.TaskItemId` → `TaskItem.Id`, required FK, `OnDelete(DeleteBehavior.Cascade)` (deleting a task deletes its comments).
- Seed the fixed label catalog via `modelBuilder.Entity<Label>().HasData(...)` with exactly these 7 rows (id, name, tone):
  - `design`, `Design`, `coral`
  - `research`, `Research`, `violet`
  - `writing`, `Writing`, `amber`
  - `bug`, `Bug`, `rose`
  - `chore`, `Chore`, `slate`
  - `health`, `Health`, `teal`
  - `learning`, `Learning`, `blue`

## What to do

1. Update `server/Entities/Enums.cs`: add `Backlog` to `BoardColumn` as specified.
2. Update `server/Entities/TaskItem.cs`: add `DueDate` and the `Labels` navigation collection as specified.
3. Create `server/Entities/Label.cs`, `server/Entities/Subtask.cs`, `server/Entities/Comment.cs` exactly as specified.
4. Update `server/Data/AppDbContext.cs`: add the three new `DbSet`s, the many-to-many config, the two cascade-delete FK configs, and the `HasData` seed for the 7 labels.
5. Run `dotnet ef migrations add AddSproutSchema` from `server/` to generate the migration under `server/Migrations/`.
6. Verify: with Postgres running (`docker compose up -d` from the repo root), run `dotnet run` from `server/` and confirm the migration applies cleanly, creating the new columns/tables (`Labels`, `Subtasks`, `Comments`, the implicit `LabelTaskItem` join table, and the new `DueDate` column on `Tasks`), with the 7 labels present in the `Labels` table.

## Acceptance criteria

- [x] `BoardColumn` has exactly four values in order: `Backlog, ToDo, InProgress, Done`.
- [x] `TaskItem` has a nullable `DueDate` field of type `DateOnly?`.
- [x] `Label`, `Subtask`, `Comment` entity classes exist matching the shapes above exactly.
- [x] `AppDbContext` exposes `DbSet<Label> Labels`, `DbSet<Subtask> Subtasks`, `DbSet<Comment> Comments`, with the many-to-many and cascade-delete configuration described.
- [x] `dotnet ef migrations add AddSproutSchema` has been run and the resulting files are checked in under `server/Migrations/`.
- [x] With Postgres running, `dotnet run` from `server/` auto-applies the migration; a `SELECT * FROM "Labels"` (via `docker exec kanban-postgres psql -U kanban -d kanban -c '...'`) shows exactly the 7 seeded rows with correct `Id`/`Name`/`Tone` values.
- [x] Deleting a `TaskItem` directly against the database also removes its `Subtask` and `Comment` rows (cascade) — verify by inserting a task with a subtask/comment via SQL, deleting the task, and confirming the child rows are gone.
- [x] Existing functionality is unaffected: the app still builds, still serves existing endpoints, and no existing `TaskItem`/`Project` data is lost by the migration (verify on a fresh/empty database, since this is local dev data with no production concern).

## Out of scope

- Do not create any Controllers, DTOs, or API endpoints for labels/subtasks/comments/due-date — those are tasks 201, 202, 301, 302.
- Do not add any label management (create/rename/delete) capability — the label catalog is fixed and seeded only.
- Do not add an author/assignee field to `Comment` or any `Person`/`User` entity — out of scope per the PRD's Non-Goals.
