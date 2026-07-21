---
id: 301
title: Subtasks API
status: done
wave: 3
depends_on: [102, 201]
priority: high
estimate: S
files:
  - server/Controllers/TasksController.Subtasks.cs
  - server/Dtos/SubtaskDto.cs
  - server/Dtos/CreateSubtaskRequest.cs
  - server/Dtos/ToggleSubtaskRequest.cs
prd_refs: [FR-25]
agent_ready: true
---

# 301 – Subtasks API

## Context (self-contained)

We are adding a subtasks feature to an existing Kanban board API (ASP.NET Core + EF Core + PostgreSQL). Each task can have zero or more subtasks (a short text + a done flag), used for tracking partial progress on a larger task. A prior task (102, already done) added the `Subtask` entity:
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
`AppDbContext` exposes `DbSet<Subtask> Subtasks` with a cascade-delete FK to `TaskItem`. Another prior task (201, already done) made `TasksController` a `partial class` specifically so this task can add its endpoints in a **separate file** without touching the existing controller file — avoiding any merge conflict with a sibling task (302, Comments API) that's doing the same thing for comments, in parallel, right now.

Task 201 also defined `SubtaskDto` and `CommentDto` as temporary placeholder records inside `server/Dtos/TaskDetailDto.cs` (to make that file compile before this task exists). This task's job includes **moving** the `SubtaskDto` definition out of `TaskDetailDto.cs` into its own file (`server/Dtos/SubtaskDto.cs`) — the shape must stay identical so `TaskDetailDto.cs` keeps compiling unchanged.

## Interfaces you must conform to

Routes (both nested under an existing task, matching `TasksController`'s existing `[Route("api/[controller]")]` base of `api/tasks`):
- `POST /api/tasks/{id}/subtasks` with body `CreateSubtaskRequest { text: string }` → `201 Created`, the created `SubtaskDto`. New subtask's `Position` is the end of that task's existing subtasks (`(max existing Position) + 1`, or `0` if none). Return `404` if the task doesn't exist.
- `PATCH /api/tasks/{id}/subtasks/{subtaskId}` with body `ToggleSubtaskRequest { done: boolean }` → `200 OK`, the updated `SubtaskDto`. Return `404` if the task or subtask doesn't exist, or the subtask doesn't belong to that task.

**`SubtaskDto`** (`server/Dtos/SubtaskDto.cs`, new file — move out of `TaskDetailDto.cs`):
```csharp
public record SubtaskDto(int Id, string Text, bool Done, int Position);
```

**`CreateSubtaskRequest`** (`server/Dtos/CreateSubtaskRequest.cs`):
```csharp
public class CreateSubtaskRequest
{
    [Required, MinLength(1)]
    public required string Text { get; set; }
}
```

**`ToggleSubtaskRequest`** (`server/Dtos/ToggleSubtaskRequest.cs`):
```csharp
public class ToggleSubtaskRequest
{
    [Required]
    public required bool Done { get; set; }
}
```

## What to do

1. Remove the placeholder `SubtaskDto` record from `server/Dtos/TaskDetailDto.cs` (leave `CommentDto` there untouched — that's task 302's job to move) and create `server/Dtos/SubtaskDto.cs` with the identical shape, so nothing else in the codebase needs to change.
2. Create `server/Dtos/CreateSubtaskRequest.cs` and `server/Dtos/ToggleSubtaskRequest.cs` exactly as specified.
3. Create `server/Controllers/TasksController.Subtasks.cs` as a second partial-class file for `TasksController` (`public partial class TasksController { ... }`), injecting `AppDbContext` is already available via the primary constructor in the main `TasksController.cs` file — reuse the existing injected `_db` field (do not re-declare it or add a second constructor; partial classes share the same instance fields).
4. Implement `POST /api/tasks/{id}/subtasks`: verify the task exists (404 otherwise), compute the new subtask's position as described, create and save, return `201` with the `SubtaskDto`.
5. Implement `PATCH /api/tasks/{id}/subtasks/{subtaskId}`: verify the task exists AND the subtask exists and belongs to that task (404 otherwise), set `Done`, save, return `200` with the updated `SubtaskDto`.

## Acceptance criteria

- [x] `POST /api/tasks/{id}/subtasks` with `{ "text": "Draft outline" }` returns `201` with `{ id, text: "Draft outline", done: false, position: 0 }` for the first subtask on that task; a second call returns `position: 1`.
- [x] `POST /api/tasks/{nonexistent}/subtasks` returns `404`.
- [x] `PATCH /api/tasks/{id}/subtasks/{subtaskId}` with `{ "done": true }` returns `200` with `done: true`; a subsequent `GET /api/tasks/{id}` (from task 201) shows the subtask as done and the task's `subtaskDone` count incremented (verify via the list endpoint's `subtaskTotal`/`subtaskDone` fields too).
- [x] `PATCH` on a subtask id that doesn't belong to the given task id returns `404`.
- [x] `PATCH /api/tasks/{id}/subtasks/{nonexistent}` returns `404`.
- [x] `server/Dtos/TaskDetailDto.cs` still compiles and `GET /api/tasks/{id}` still returns subtasks correctly, now sourced from the moved `SubtaskDto` in its own file.
- [x] `dotnet build` succeeds.

## Out of scope

- Do not touch `server/Controllers/TasksController.cs` (the main file) — you're adding a new partial-class file instead.
- Do not touch `server/Controllers/TasksController.Comments.cs`, `server/Dtos/CommentDto.cs`, or `server/Dtos/CreateCommentRequest.cs` — owned by task 302, running in parallel.
- No subtask deletion or reordering endpoint — not required by the PRD for this MVP.
