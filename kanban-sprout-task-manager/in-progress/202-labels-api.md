---
id: 202
title: Labels API
status: in-progress
wave: 2
depends_on: [102]
priority: medium
estimate: S
files:
  - server/Controllers/LabelsController.cs
  - server/Dtos/LabelDto.cs
prd_refs: [FR-16, FR-23]
agent_ready: true
---

# 202 – Labels API

## Context (self-contained)

We are extending an existing Kanban board API (ASP.NET Core + EF Core + PostgreSQL) to support the "Sprout" redesign's label tagging feature. A prior task (102, already done) added a `Label` entity with a **fixed, seeded catalog of 7 labels** — there is no create/rename/delete capability for labels in this MVP (see the source PRD's Open Questions: the label set is intentionally fixed for v1). This task adds the one read-only endpoint needed to list them.

The `Label` entity (`server/Entities/Label.cs`, already exists):
```csharp
public class Label
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public required string Tone { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
```
`AppDbContext` (`server/Data/AppDbContext.cs`) exposes `DbSet<Label> Labels`, seeded with exactly these 7 rows: `design`/Design/coral, `research`/Research/violet, `writing`/Writing/amber, `bug`/Bug/rose, `chore`/Chore/slate, `health`/Health/teal, `learning`/Learning/blue. The API project already has controllers support, CORS, global exception handling, and JSON configured in `Program.cs` — nothing further to configure there.

## Interfaces you must conform to

Route: `GET /api/labels` → `200 OK`, `LabelDto[]`, all 7 labels, no filtering/pagination needed.

**`LabelDto`** (`server/Dtos/LabelDto.cs`):
```csharp
public record LabelDto(string Id, string Name, string Tone);
```

This is the exact contract the frontend Label service (a later task) will consume — do not add, rename, or remove fields.

## What to do

1. Create `server/Dtos/LabelDto.cs` exactly as specified.
2. Create `server/Controllers/LabelsController.cs`, a standard `[ApiController]` with route `[Route("api/[controller]")]`, injecting `AppDbContext` via constructor.
3. Implement `GET /api/labels`: query all `Label` entities ordered by `Name`, map to `LabelDto`, return `Ok(list)`.

## Acceptance criteria

- [ ] `GET /api/labels` returns `200 OK` with exactly 7 items, each `{ id, name, tone }`, matching the seeded catalog (`design`/Design/coral, `research`/Research/violet, `writing`/Writing/amber, `bug`/Bug/rose, `chore`/Chore/slate, `health`/Health/teal, `learning`/Learning/blue).
- [ ] Response JSON field names are exactly `id`, `name`, `tone` (camelCase).
- [ ] `dotnet build` succeeds.

## Out of scope

- No `POST`/`PUT`/`DELETE` for labels — the catalog is fixed and seeded via migration only, per the PRD.
- Do not touch `server/Controllers/TasksController.cs` or any Tasks-related files — those are owned by task 201, running in parallel.
