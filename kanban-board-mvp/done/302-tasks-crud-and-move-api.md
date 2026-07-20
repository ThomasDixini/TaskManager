---
id: 302
title: Tasks API (CRUD + move/reorder endpoint)
status: done
wave: 3
depends_on: [201]
priority: high
estimate: M
files:
  - server/Dtos/TaskDto.cs
  - server/Dtos/CreateTaskRequest.cs
  - server/Dtos/UpdateTaskRequest.cs
  - server/Dtos/MoveTaskRequest.cs
  - server/Controllers/TasksController.cs
  - server/Services/TaskPositionService.cs
prd_refs: [FR-2, FR-4, FR-6, FR-7, FR-8, FR-9, FR-10, FR-14]
agent_ready: true
---

# 302 – Tasks API (CRUD + move/reorder endpoint)

## Context (self-contained)

We are building a personal, local-only Kanban board app. The board has three fixed columns (To Do, In Progress, Done). Tasks are created via a "quick add" (title only) and enriched later via an edit modal (description, project, priority). Cards are dragged between/within columns; each drag move must persist through a **dedicated** endpoint that only touches column + position — never the general update endpoint — so that a background drag doesn't clobber an in-progress edit of other fields, and vice versa.

The `TaskItem` entity already exists (from a prior task) at `server/Entities/TaskItem.cs`:
```csharp
public class TaskItem
{
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
And the enums at `server/Entities/Enums.cs`:
```csharp
public enum BoardColumn { ToDo, InProgress, Done }
public enum Priority { Low, Medium, High }
```
`AppDbContext` (`server/Data/AppDbContext.cs`) exposes `DbSet<TaskItem> Tasks` and `DbSet<Project> Projects`. `Program.cs` already has controllers, CORS, global exception handling, and JSON string-enum serialization configured — nothing further to add there. Enums serialize as their string names over JSON (e.g. `"ToDo"`, `"Medium"`).

**Position model**: within each column, tasks are ordered by an integer `Position` (0-based, contiguous — 0, 1, 2, ...). Moving a task means: remove it from its old position (shifting later tasks in that column down by one to close the gap), then insert it at its new position in the destination column (shifting tasks at/after that position up by one to make room). If the move is within the same column, both operations happen against that one column's ordering.

## Interfaces you must conform to

Routes (all under `/api/tasks`):

- `GET /api/tasks?projectId={int}` → `200 OK`, returns `TaskDto[]`. The `projectId` query param is **optional** — when omitted, return all tasks; when present, return only tasks with that `ProjectId`. Order results by `Column`, then `Position`.
- `POST /api/tasks` with body `CreateTaskRequest { title: string }` → `201 Created`, returns the created `TaskDto`. The new task is created with `Column = ToDo`, `Description = null`, `ProjectId = null`, `Priority = null`, and `Position` set to the end of the ToDo column (i.e. `(max existing Position in ToDo) + 1`, or `0` if ToDo is empty).
- `PUT /api/tasks/{id}` with body `UpdateTaskRequest { title: string, description: string?, projectId: int?, priority: string? }` → `200 OK`, returns the updated `TaskDto`. This endpoint updates **only** `Title`, `Description`, `ProjectId`, `Priority` — it must NOT change `Column` or `Position`. Return `404 Not Found` if the task doesn't exist.
- `DELETE /api/tasks/{id}` → `204 No Content`. Return `404 Not Found` if the task doesn't exist.
- `PATCH /api/tasks/{id}/move` with body `MoveTaskRequest { column: string, position: int }` → `200 OK`, returns the updated `TaskDto`. This endpoint updates **only** `Column` and `Position`, running the reindexing logic described above so no two tasks in the same column end up with the same position and positions stay contiguous. Return `404 Not Found` if the task doesn't exist.

**`TaskDto`** (`server/Dtos/TaskDto.cs`):
```csharp
public record TaskDto(int Id, string Title, string? Description, int? ProjectId, string? Priority, string Column, int Position);
```
(`Priority` and `Column` serialize as their string enum names, e.g. `"Medium"`, `"ToDo"` — handled automatically by the `JsonStringEnumConverter` already configured in `Program.cs`, as long as you map the DTO fields directly from the entity's enum properties without converting to string yourself; if you do convert manually, use `.ToString()` which produces the same names.)

**`CreateTaskRequest`** (`server/Dtos/CreateTaskRequest.cs`):
```csharp
public class CreateTaskRequest
{
    [Required, MinLength(1)]
    public required string Title { get; set; }
}
```

**`UpdateTaskRequest`** (`server/Dtos/UpdateTaskRequest.cs`):
```csharp
public class UpdateTaskRequest
{
    [Required, MinLength(1)]
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int? ProjectId { get; set; }
    public Priority? Priority { get; set; }
}
```

**`MoveTaskRequest`** (`server/Dtos/MoveTaskRequest.cs`):
```csharp
public class MoveTaskRequest
{
    [Required]
    public required BoardColumn Column { get; set; }
    [Required]
    public required int Position { get; set; }
}
```

This `TaskDto` shape is the exact contract the frontend Tasks service (a later task) will consume — do not add, rename, or remove fields.

## What to do

1. Create the four DTO files exactly as specified above.
2. Create `server/Services/TaskPositionService.cs` with the reindexing logic, e.g. a method like `Task MoveAsync(AppDbContext db, int taskId, BoardColumn targetColumn, int targetPosition)` that:
   - Loads the task; if not found, signal "not found" (e.g. return `null` or throw a specific exception the controller catches and maps to 404 — your choice, keep it simple).
   - If moving within the same column: shifts positions of tasks between the old and new position by ±1 as appropriate, then sets the task's `Position` to `targetPosition`.
   - If moving to a different column: decrements `Position` for tasks after the old position in the source column (closing the gap), increments `Position` for tasks at/after `targetPosition` in the destination column (making room), then sets the task's `Column` and `Position`.
   - Clamp `targetPosition` to a valid range (0 to the destination column's current task count) to avoid gaps if the frontend sends an out-of-range value.
   - Persist all changes via `AppDbContext.SaveChangesAsync()` in one call (single transaction).
3. Create `server/Controllers/TasksController.cs`, a standard `[ApiController]` with route `[Route("api/[controller]")]`, injecting `AppDbContext` and `TaskPositionService` via constructor.
4. Implement all five endpoints as specified above. For `POST`, compute the new task's `Position` as described. Map entity → `TaskDto` manually (no AutoMapper).
5. Register `TaskPositionService` for DI in `server/Program.cs` (add one line, e.g. `builder.Services.AddScoped<TaskPositionService>();` — this is the one small addition to `Program.cs` needed for this task; everything else there is already set up).

## Acceptance criteria

- [x] `POST /api/tasks` with `{ "title": "Fix bug" }` returns `201 Created` with a `TaskDto` where `column` is `"ToDo"`, `priority` and `description` are `null`, `projectId` is `null`, and `position` is `0` (if it's the first task) or one past the current max in ToDo.
- [x] `GET /api/tasks` returns all tasks ordered by column then position; `GET /api/tasks?projectId=1` returns only tasks with that project.
- [x] `PUT /api/tasks/{id}` updates title/description/projectId/priority and leaves `column`/`position` unchanged; returns `404` for a non-existent id.
- [x] `DELETE /api/tasks/{id}` removes the task and returns `204`; a subsequent `GET /api/tasks` no longer includes it; returns `404` for a non-existent id.
- [x] `PATCH /api/tasks/{id}/move` with `{ "column": "InProgress", "position": 0 }` moves the task to the top of In Progress, and any task previously at position 0+ in In Progress shifts down by one (verify via a subsequent `GET /api/tasks`); the moved task's title/description/projectId/priority are unchanged.
- [x] Moving a task within the same column (e.g. from position 2 to position 0) reorders the intervening tasks correctly with no duplicate or gapped positions in that column afterward.
- [x] After any move, positions within each affected column remain a contiguous 0-based sequence (no duplicates, no gaps).

## Out of scope

- Do not touch `server/Controllers/ProjectsController.cs` or `server/Dtos/ProjectDto.cs`/`CreateProjectRequest.cs` — owned by task 301, running in parallel.
- Do not add pagination, sorting options beyond column+position, or search/filter beyond the `projectId` query param.
- Do not modify `server/Data/AppDbContext.cs` or the entity classes — already complete from a prior task.
