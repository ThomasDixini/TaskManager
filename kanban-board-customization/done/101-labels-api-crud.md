---
id: 101
title: Labels API — create/update/delete endpoints
status: done
wave: 1
depends_on: []
priority: high
estimate: S
files:
  - server/Controllers/LabelsController.cs
  - server/Dtos/CreateLabelRequest.cs
  - server/Dtos/UpdateLabelRequest.cs
prd_refs: [FR-2, FR-3, FR-4, FR-5]
agent_ready: true
---

# 101 – Labels API — create/update/delete endpoints

## Context (self-contained)

We are extending an existing Kanban board API (ASP.NET Core + EF Core + PostgreSQL) so the user can fully manage the label catalog — today it's a read-only, fixed set of 7 labels (design/research/writing/bug/chore/health/learning), each with a name and a "tone" (a color keyword). This task adds create/update/delete so the user isn't stuck with only those 7.

The `Label` entity (`server/Entities/Label.cs`, already exists, unchanged by this task):
```csharp
public class Label
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public required string Tone { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
```
`AppDbContext` exposes `DbSet<Label> Labels`. The many-to-many join table between `TaskItem` and `Label` (`LabelTaskItem`, EF-generated, no explicit entity class) already cascade-deletes on the `Labels` side — configured in the original `AddSproutSchema` migration (`FK_LabelTaskItem_Labels_LabelsId ... onDelete: Cascade`). This means deleting a `Label` row automatically removes it from every task's label list at the database level — you do not need to write any cascade logic yourself.

The existing `LabelsController` (`server/Controllers/LabelsController.cs`) only has `GET /api/labels`, which you are extending, not replacing:
```csharp
[ApiController]
[Route("api/[controller]")]
public class LabelsController : ControllerBase
{
    private readonly AppDbContext _db;
    public LabelsController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LabelDto>>> GetLabels() { /* unchanged */ }
}
```
`LabelDto` (`server/Dtos/LabelDto.cs`, already exists, unchanged): `public record LabelDto(string Id, string Name, string Tone);`

The 7 known, valid tone keywords are: `coral`, `amber`, `teal`, `violet`, `blue`, `rose`, `slate` — these correspond to fixed CSS variables (`--tone-coral`, etc.) on the frontend, each with light/dark theme support already built. There is no free-form color input anywhere in this feature — the frontend will only ever send one of these 7 strings, but the API must not trust that blindly.

## Interfaces you must conform to

Routes (added to the existing `LabelsController`):
- `POST /api/labels` with body `CreateLabelRequest { name: string, tone: string }` → `201 Created`, the created `LabelDto`. The server generates the label's `Id` as a URL-safe slug of `name` (lowercase, spaces/non-alphanumerics collapsed to single hyphens, e.g. "Waiting on Client" → `waiting-on-client`). If the generated slug already exists, append `-2`, `-3`, etc. until unique. Returns `400` if `tone` is not one of the 7 known values.
- `PUT /api/labels/{id}` with body `UpdateLabelRequest { name: string, tone: string }` → `200 OK`, the updated `LabelDto`. Renames and recolors in one call — `id` itself never changes. Returns `404` if the label doesn't exist, `400` if `tone` is invalid.
- `DELETE /api/labels/{id}` → `204 No Content`. Returns `404` if the label doesn't exist. Deleting removes the label from every task currently tagged with it (via the existing cascade) without deleting those tasks.

**`CreateLabelRequest`** (`server/Dtos/CreateLabelRequest.cs`, new):
```csharp
public class CreateLabelRequest
{
    [Required, MinLength(1)]
    public required string Name { get; set; }
    [Required]
    public required string Tone { get; set; }
}
```

**`UpdateLabelRequest`** (`server/Dtos/UpdateLabelRequest.cs`, new):
```csharp
public class UpdateLabelRequest
{
    [Required, MinLength(1)]
    public required string Name { get; set; }
    [Required]
    public required string Tone { get; set; }
}
```

This exact contract (routes, request/response shapes, slug-generation behavior, tone validation) is what a later task (203, frontend `LabelService` extension) will consume — do not deviate from it.

## What to do

1. Create `server/Dtos/CreateLabelRequest.cs` and `server/Dtos/UpdateLabelRequest.cs` exactly as specified.
2. In `server/Controllers/LabelsController.cs`, add a private static array/set of the 7 valid tone keywords and a small validation helper.
3. Implement `POST /api/labels`: validate tone, generate a unique slug id from `name` (query existing `Label` ids to check collisions), create and save the `Label`, return `201` with the `LabelDto`.
4. Implement `PUT /api/labels/{id}`: look up the label (404 if missing), validate tone (400 if invalid), update `Name`/`Tone`, save, return `200` with the updated `LabelDto`.
5. Implement `DELETE /api/labels/{id}`: look up the label (404 if missing), remove it (EF Core's cascade config handles the join-table cleanup automatically since `Label.Tasks` is the many-to-many navigation), save, return `204`.

## Acceptance criteria

- [x] `POST /api/labels` with `{ "name": "Waiting on Client", "tone": "amber" }` returns `201` with `{ id: "waiting-on-client", name: "Waiting on Client", tone: "amber" }`.
- [x] `POST /api/labels` with a `name` that slugs to an existing id (e.g. posting "Bug" again when `bug` already exists) returns `201` with a de-duplicated id like `bug-2`.
- [x] `POST /api/labels` with `{ "name": "x", "tone": "neon-pink" }` (not one of the 7 known tones) returns `400`.
- [x] `PUT /api/labels/bug` with `{ "name": "Bugs", "tone": "rose" }` returns `200` with the label renamed/recolored, and `GET /api/labels` reflects the change; the label's `id` is still `bug`.
- [x] `PUT /api/labels/{nonexistent}` returns `404`.
- [x] `DELETE /api/labels/bug` on a label currently attached to at least one task (create a task, `PUT` it with `"labelIds": ["bug"]` first, via the existing Tasks API) returns `204`; a subsequent `GET /api/tasks/{id}` for that task shows `labelIds` no longer containing `"bug"`, and the task itself still exists.
- [x] `DELETE /api/labels/{nonexistent}` returns `404`.
- [x] `dotnet build` succeeds.

## Out of scope

- Do not touch `server/Entities/Label.cs`, `server/Dtos/LabelDto.cs`, or the existing `GET /api/labels` action — all unchanged.
- Do not touch anything under `server/Controllers/TasksController*.cs` or `server/Entities/TaskItem.cs` — unrelated to this task.
- Do not build any frontend UI or service changes — that's tasks 203/302, in later waves.
- Do not add label reordering — not requested; only columns need reordering in this effort.
