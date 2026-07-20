---
id: 301
title: Projects API (list + create)
status: backlog
wave: 3
depends_on: [201]
priority: high
estimate: S
files:
  - server/Dtos/ProjectDto.cs
  - server/Dtos/CreateProjectRequest.cs
  - server/Controllers/ProjectsController.cs
prd_refs: [FR-5, FR-10]
agent_ready: true
---

# 301 – Projects API (list + create)

## Context (self-contained)

We are building a personal, local-only Kanban board app. Projects are a lightweight managed entity used to tag tasks and filter the board — the PRD explicitly scopes this MVP to **no dedicated Projects management screen**: projects are only ever created inline, from the task editor's project dropdown ("+ add new project"), never renamed or deleted through the UI. So the API surface for Projects in this MVP is intentionally minimal: list all projects (to populate the dropdown/filter) and create a new one.

The `Project` entity already exists (from a prior task) at `server/Entities/Project.cs`:
```csharp
public class Project
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
```
`AppDbContext` (at `server/Data/AppDbContext.cs`) exposes `DbSet<Project> Projects`. The API project already has controllers support, CORS for `http://localhost:4200`, global `ProblemDetails` exception handling, and JSON enum-as-string serialization configured in `Program.cs` — nothing further to configure there for this task.

## Interfaces you must conform to

Routes (all under `/api/projects`, matching the `[Route("api/[controller]")]` convention):

- `GET /api/projects` → `200 OK`, returns `ProjectDto[]`, all projects, no pagination needed (MVP scale).
- `POST /api/projects` with body `CreateProjectRequest { name: string }` → `201 Created`, returns the created `ProjectDto`. `name` is required and must not be empty/whitespace-only — return `400 Bad Request` (via standard ASP.NET Core model validation / `[Required]`) if missing or blank.

**`ProjectDto`** (`server/Dtos/ProjectDto.cs`):
```csharp
public record ProjectDto(int Id, string Name);
```

**`CreateProjectRequest`** (`server/Dtos/CreateProjectRequest.cs`):
```csharp
public class CreateProjectRequest
{
    [Required, MinLength(1)]
    public required string Name { get; set; }
}
```

This `ProjectDto` shape (`{ id: number, name: string }`) is the exact contract the frontend Projects service (a later task) will deserialize — do not add or rename fields.

## What to do

1. Create `server/Dtos/ProjectDto.cs` and `server/Dtos/CreateProjectRequest.cs` exactly as specified above.
2. Create `server/Controllers/ProjectsController.cs`, a standard `[ApiController]` with route `[Route("api/[controller]")]`, injecting `AppDbContext` via constructor.
3. Implement `GET /api/projects`: query all `Project` entities ordered by `Name`, map to `ProjectDto`, return `Ok(list)`.
4. Implement `POST /api/projects`: accept `CreateProjectRequest` from the body (model validation handles the required/non-empty check automatically via `[ApiController]`'s automatic 400 response), create a new `Project` entity, save via `AppDbContext`, return `CreatedAtAction` (or simply `Created`) with the mapped `ProjectDto`.
5. Map entity → DTO manually with plain object construction (no AutoMapper) — e.g. `new ProjectDto(project.Id, project.Name)`.

## Acceptance criteria

- [ ] `GET /api/projects` returns `200 OK` with an empty array when no projects exist, and an array of `{ id, name }` objects once projects have been created.
- [ ] `POST /api/projects` with `{ "name": "My Project" }` returns `201 Created` with the created project's `{ id, name }`, and a subsequent `GET /api/projects` includes it.
- [ ] `POST /api/projects` with `{ "name": "" }` or missing `name` returns `400 Bad Request` with a `ProblemDetails`-shaped validation error body (ASP.NET Core's default for `[ApiController]` model validation failures).
- [ ] Response JSON field names are exactly `id` and `name` (camelCase, ASP.NET Core's default JSON casing).

## Out of scope

- No `PUT`/`PATCH` (rename) or `DELETE` endpoint for projects — explicitly out of scope for this MVP per the PRD (no dedicated management screen; deletion behavior when tasks reference a project is an open question not resolved for this iteration).
- Do not touch `server/Controllers/TasksController.cs`, `server/Dtos/TaskDto.cs`, or any other Tasks-related files — those are owned by task 302, running in parallel.
- Do not modify `server/Program.cs`, `server/Data/AppDbContext.cs`, or the entity classes — those are already complete from prior tasks.
