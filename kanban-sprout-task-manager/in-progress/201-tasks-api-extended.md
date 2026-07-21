---
id: 201
title: Tasks API extended (due date, labels, counts, get-by-id)
status: in-progress
wave: 2
depends_on: [102]
priority: high
estimate: M
files:
  - server/Controllers/TasksController.cs
  - server/Dtos/TaskDto.cs
  - server/Dtos/CreateTaskRequest.cs
  - server/Dtos/UpdateTaskRequest.cs
  - server/Dtos/TaskDetailDto.cs
prd_refs: [FR-13, FR-16, FR-17, FR-22, FR-23, FR-25, FR-26]
agent_ready: true
---

# 201 – Tasks API extended (due date, labels, counts, get-by-id)

## Context (self-contained)

We are extending an existing Tasks API (ASP.NET Core, `TasksController` at `server/Controllers/TasksController.cs`) to support the "Sprout" redesign's richer task data: due dates, multiple labels, and lightweight subtask/comment counts (full subtask/comment lists come from a new single-task endpoint this task adds). A prior task (102, already done) added the underlying entities: `TaskItem.DueDate` (`DateOnly?`), `TaskItem.Labels` (many-to-many with `Label`), `Subtask` (FK `TaskItemId`), `Comment` (FK `TaskItemId`). `Label` has `{ Id: string, Name: string, Tone: string }`. `AppDbContext` exposes `DbSet<TaskItem> Tasks`, `DbSet<Label> Labels`, `DbSet<Subtask> Subtasks`, `DbSet<Comment> Comments`.

The existing `TasksController` already has working `GET /api/tasks`, `POST /api/tasks`, `PUT /api/tasks/{id}`, `DELETE /api/tasks/{id}`, and `PATCH /api/tasks/{id}/move` endpoints, using `TaskDto`, `CreateTaskRequest`, `UpdateTaskRequest`, and a `TaskPositionService` for the move endpoint (`server/Services/TaskPositionService.cs` — do not touch it, it's unaffected by this task). This task extends the existing DTOs/endpoints and adds one new endpoint (`GET /api/tasks/{id}`). Two sibling tasks (202, Labels API; 203, frontend theme service) are running in parallel right now — they touch entirely different files, no coordination needed.

This task also makes `TasksController` a `partial class` — two later tasks (301, 302) each add a separate partial-class file (`TasksController.Subtasks.cs`, `TasksController.Comments.cs`) for the new subtask/comment endpoints, so they never need to touch this file.

## Interfaces you must conform to

**`TaskDto`** (`server/Dtos/TaskDto.cs`) — extend the existing record with four new fields, in this order:
```csharp
public record TaskDto(
    int Id, string Title, string? Description, int? ProjectId, string? Priority,
    string Column, int Position, string? DueDate, string[] LabelIds,
    int SubtaskTotal, int SubtaskDone, int CommentCount);
```
`DueDate` serializes as `"yyyy-MM-dd"` or `null` (map from `task.DueDate?.ToString("yyyy-MM-dd")`). `LabelIds` is the list of label id strings attached to the task (map from `task.Labels.Select(l => l.Id)`).

**`TaskDetailDto`** (`server/Dtos/TaskDetailDto.cs`, new) — same fields as `TaskDto` plus full subtask/comment lists:
```csharp
public record TaskDetailDto(
    int Id, string Title, string? Description, int? ProjectId, string? Priority,
    string Column, int Position, string? DueDate, string[] LabelIds,
    SubtaskDto[] Subtasks, CommentDto[] Comments);
```
Note: `TaskDetailDto` does NOT need `SubtaskTotal`/`SubtaskDone`/`CommentCount` since the caller can derive counts from the full `Subtasks`/`Comments` arrays. `SubtaskDto` and `CommentDto` types don't exist yet (they're added by tasks 301/302) — define minimal placeholder-compatible shapes now so this compiles standalone, matching what 301/302 will produce exactly:
```csharp
// Temporary local records in TaskDetailDto.cs — 301/302 will move these into their own
// SubtaskDto.cs / CommentDto.cs files; keep the shapes identical so no breaking change occurs.
public record SubtaskDto(int Id, string Text, bool Done, int Position);
public record CommentDto(int Id, string Text, DateTime CreatedAt);
```
(If tasks 301/302 haven't run yet, defining these here is what makes this task buildable and testable in isolation — 301/302 will find these records already correctly shaped and simply own the files going forward; do not let this block you.)

**`CreateTaskRequest`** (`server/Dtos/CreateTaskRequest.cs`) — add an optional `Column`:
```csharp
public class CreateTaskRequest
{
    [Required, MinLength(1)]
    public required string Title { get; set; }
    public BoardColumn? Column { get; set; }
}
```
When `Column` is omitted/null, default to `BoardColumn.ToDo` (existing behavior, unchanged). When provided, create the task in that column instead — this implements the PRD's quick-add-in-any-column requirement (FR-13).

**`UpdateTaskRequest`** (`server/Dtos/UpdateTaskRequest.cs`) — add `DueDate` and `LabelIds`:
```csharp
public class UpdateTaskRequest
{
    [Required, MinLength(1)]
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int? ProjectId { get; set; }
    public Priority? Priority { get; set; }
    public string? DueDate { get; set; }       // "yyyy-MM-dd" or null
    public string[] LabelIds { get; set; } = Array.Empty<string>();
}
```

Routes:
- `GET /api/tasks/{id}` (**new**) → `200` `TaskDetailDto` with full `Subtasks`/`Comments` loaded, or `404` if not found.
- `GET /api/tasks?projectId={int?}` (extended DTO, same route/behavior otherwise).
- `POST /api/tasks` (extended: honors optional `Column`).
- `PUT /api/tasks/{id}` (extended: parses `DueDate` string to `DateOnly?`, resolves `LabelIds` to `Label` entities via `_db.Labels.Where(l => request.LabelIds.Contains(l.Id))` and sets `task.Labels` to that resolved set — replacing the task's labels wholesale, not merging).
- `DELETE /api/tasks/{id}`, `PATCH /api/tasks/{id}/move` — unchanged.

## What to do

1. Update `server/Dtos/TaskDto.cs` to the extended record shape above.
2. Create `server/Dtos/TaskDetailDto.cs` with `TaskDetailDto` and the two placeholder `SubtaskDto`/`CommentDto` records as specified.
3. Update `server/Dtos/CreateTaskRequest.cs` to add the optional `Column` field.
4. Update `server/Dtos/UpdateTaskRequest.cs` to add `DueDate` and `LabelIds`.
5. Update `server/Controllers/TasksController.cs`:
   - Change `public class TasksController` to `public partial class TasksController`.
   - Update the `GetTasks` action's mapping to populate the four new `TaskDto` fields (subtask/comment counts via `.Include(t => t.Subtasks).Include(t => t.Comments).Include(t => t.Labels)` or projection with `Count()`/`Count(s => s.Done)`).
   - Add a new `[HttpGet("{id}")] GetTask(int id)` action returning `TaskDetailDto` (404 if not found), loading the task with its `Labels`, `Subtasks` (ordered by `Position`), and `Comments` (ordered by `CreatedAt`).
   - Update `CreateTask` to use `request.Column ?? BoardColumn.ToDo` and compute the new task's `Position` as the end of THAT column (not always ToDo).
   - Update `UpdateTask` to parse `DueDate` (nullable `DateOnly.Parse`) and resolve+set `Labels` from `LabelIds` as described above, in addition to the existing title/description/projectId/priority update.
   - Update the `MapToDto` helper (or equivalent) to include the four new fields.

## Acceptance criteria

- [ ] `GET /api/tasks/{id}` returns `200` with a `TaskDetailDto` including full `subtasks`/`comments` arrays (empty arrays if none) for an existing task, and `404` for a non-existent id.
- [ ] `GET /api/tasks` response items include `dueDate`, `labelIds`, `subtaskTotal`, `subtaskDone`, `commentCount` fields with correct values (verify by creating a task, adding data via direct SQL if subtask/comment endpoints aren't built yet, and checking the list response reflects the counts).
- [ ] `POST /api/tasks` with `{ "title": "x" }` still creates in `ToDo` at the end of that column (unchanged default).
- [ ] `POST /api/tasks` with `{ "title": "x", "column": "Backlog" }` creates the task with `column: "Backlog"` and the correct end-of-column position.
- [ ] `PUT /api/tasks/{id}` with `{ ..., "dueDate": "2026-08-01", "labelIds": ["bug", "chore"] }` updates both fields; a subsequent `GET /api/tasks/{id}` reflects `dueDate: "2026-08-01"` and `labelIds` containing exactly `["bug", "chore"]` (order-independent).
- [ ] `PUT /api/tasks/{id}` with `"labelIds": []` clears all labels from the task.
- [ ] `PUT /api/tasks/{id}` with `"dueDate": null` clears the due date.
- [ ] Existing `DELETE` and `PATCH .../move` behavior is unchanged (spot-check both still work as before).
- [ ] `dotnet build` succeeds.

## Out of scope

- Do not implement the actual subtask/comment CRUD endpoints — those are tasks 301/302 (this task only defines placeholder-compatible `SubtaskDto`/`CommentDto` shapes so `TaskDetailDto` compiles).
- Do not touch `server/Controllers/LabelsController.cs` or any labels-catalog endpoint — that's task 202, running in parallel.
- Do not touch `server/Services/TaskPositionService.cs` or the move endpoint's reindexing logic — unaffected by this task.
