---
id: 302
title: Comments API
status: in-progress
wave: 3
depends_on: [102, 201]
priority: medium
estimate: S
files:
  - server/Controllers/TasksController.Comments.cs
  - server/Dtos/CommentDto.cs
  - server/Dtos/CreateCommentRequest.cs
prd_refs: [FR-26]
agent_ready: true
---

# 302 – Comments API

## Context (self-contained)

We are adding a comments/activity feed feature to an existing Kanban board API (ASP.NET Core + EF Core + PostgreSQL). Each task can have zero or more comments (plain text with a timestamp) — a running log the user can leave on a task. There is no author/assignee concept in this app (single local user, no auth — see the source PRD's Non-Goals), so comments have no author field; they're implicitly from "you". A prior task (102, already done) added the `Comment` entity:
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
`AppDbContext` exposes `DbSet<Comment> Comments` with a cascade-delete FK to `TaskItem`. Another prior task (201, already done) made `TasksController` a `partial class` specifically so this task can add its endpoint in a **separate file** without touching the existing controller file — avoiding any merge conflict with a sibling task (301, Subtasks API) doing the same thing for subtasks, in parallel, right now.

Task 201 also defined `CommentDto` as a temporary placeholder record inside `server/Dtos/TaskDetailDto.cs` (to make that file compile before this task exists). This task's job includes **moving** the `CommentDto` definition out of `TaskDetailDto.cs` into its own file (`server/Dtos/CommentDto.cs`) — the shape must stay identical so `TaskDetailDto.cs` keeps compiling unchanged.

## Interfaces you must conform to

Route (nested under an existing task, matching `TasksController`'s existing `[Route("api/[controller]")]` base of `api/tasks`):
- `POST /api/tasks/{id}/comments` with body `CreateCommentRequest { text: string }` → `201 Created`, the created `CommentDto`. `CreatedAt` is set server-side to `DateTime.UtcNow`. Return `404` if the task doesn't exist.

**`CommentDto`** (`server/Dtos/CommentDto.cs`, new file — move out of `TaskDetailDto.cs`):
```csharp
public record CommentDto(int Id, string Text, DateTime CreatedAt);
```
(`CreatedAt` serializes as an ISO 8601 datetime string by default via `System.Text.Json` — no custom converter needed.)

**`CreateCommentRequest`** (`server/Dtos/CreateCommentRequest.cs`):
```csharp
public class CreateCommentRequest
{
    [Required, MinLength(1)]
    public required string Text { get; set; }
}
```

## What to do

1. Remove the placeholder `CommentDto` record from `server/Dtos/TaskDetailDto.cs` (leave `SubtaskDto` there untouched — that's task 301's job to move) and create `server/Dtos/CommentDto.cs` with the identical shape, so nothing else in the codebase needs to change.
2. Create `server/Dtos/CreateCommentRequest.cs` exactly as specified.
3. Create `server/Controllers/TasksController.Comments.cs` as a second partial-class file for `TasksController` (`public partial class TasksController { ... }`), reusing the existing injected `_db` field from the main `TasksController.cs` file (do not re-declare it or add a second constructor; partial classes share the same instance fields).
4. Implement `POST /api/tasks/{id}/comments`: verify the task exists (404 otherwise), create the comment with `CreatedAt = DateTime.UtcNow`, save, return `201` with the `CommentDto`.

## Acceptance criteria

- [ ] `POST /api/tasks/{id}/comments` with `{ "text": "Looks good" }` returns `201` with `{ id, text: "Looks good", createdAt: <ISO datetime close to now> }`.
- [ ] `POST /api/tasks/{nonexistent}/comments` returns `404`.
- [ ] A subsequent `GET /api/tasks/{id}` (from task 201) includes the new comment in its `comments` array, and the list endpoint's `commentCount` field reflects the increment.
- [ ] Adding a second comment to the same task returns a distinct `id` and both appear in `GET /api/tasks/{id}`'s `comments` array.
- [ ] `server/Dtos/TaskDetailDto.cs` still compiles and `GET /api/tasks/{id}` still returns comments correctly, now sourced from the moved `CommentDto` in its own file.
- [ ] `dotnet build` succeeds.

## Out of scope

- Do not touch `server/Controllers/TasksController.cs` (the main file) — you're adding a new partial-class file instead.
- Do not touch `server/Controllers/TasksController.Subtasks.cs`, `server/Dtos/SubtaskDto.cs`, `server/Dtos/CreateSubtaskRequest.cs`, or `server/Dtos/ToggleSubtaskRequest.cs` — owned by task 301, running in parallel.
- No comment editing, deletion, or author field — not required by the PRD for this MVP (no multi-user support).
