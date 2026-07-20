---
id: 201
title: EF Core entities, DbContext, Postgres wiring, and initial migration
status: backlog
wave: 2
depends_on: [101]
priority: high
estimate: M
files:
  - server/Entities/Project.cs
  - server/Entities/TaskItem.cs
  - server/Entities/Enums.cs
  - server/Data/AppDbContext.cs
  - server/Kanban.Api.csproj
  - server/Program.cs
  - server/appsettings.Development.json
  - server/Migrations/**
prd_refs: [FR-9, FR-12, FR-13, Technical-Considerations]
agent_ready: true
---

# 201 – EF Core entities, DbContext, Postgres wiring, and initial migration

## Context (self-contained)

We are building a personal, local-only Kanban board app. The backend is a single ASP.NET Core Web API project at `server/` (scaffolded by a prior task — `server/Kanban.Api.csproj` and `server/Program.cs` already exist, with controllers support, CORS for `http://localhost:4200`, and global exception-handling/ProblemDetails already configured; do not redo that setup, only add to `Program.cs` as instructed below).

The board has a single task list with three fixed columns (To Do, In Progress, Done) and a set of user-managed Projects. This task defines the actual data model (EF Core entities), the `DbContext`, wires up PostgreSQL, and produces the first migration. Every later backend task (Projects API, Tasks API) depends on this.

Postgres is already defined in `docker-compose.yml` (a parallel task) with these pinned values — connect using them:
- Host: `localhost`, Port: `5433`, Database: `kanban`, Username: `kanban`, Password: `kanban_dev_password`
- The API reads its connection string from the environment variable `ConnectionStrings__Default`, value: `Host=localhost;Port=5433;Database=kanban;Username=kanban;Password=kanban_dev_password`

## Interfaces you must conform to

Entity shapes — later tasks (301 Projects API, 302 Tasks API) will write DTOs and mapping code against exactly this shape, so do not deviate:

**`Project`** (`server/Entities/Project.cs`)
```csharp
public class Project
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
```

**`TaskItem`** (`server/Entities/TaskItem.cs`) — named `TaskItem`, not `Task`, to avoid colliding with `System.Threading.Tasks.Task`:
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

**Enums** (`server/Entities/Enums.cs`):
```csharp
public enum BoardColumn { ToDo, InProgress, Done }
public enum Priority { Low, Medium, High }
```
These must serialize to/from JSON as their string names (`"ToDo"`, `"InProgress"`, `"Done"`, `"Low"`, `"Medium"`, `"High"`) — configure a global `JsonStringEnumConverter` in `Program.cs`'s controller JSON options, since later API tasks' DTOs rely on string enum values over the wire.

**`AppDbContext`** (`server/Data/AppDbContext.cs`): a standard `DbContext` with `DbSet<Project> Projects` and `DbSet<TaskItem> Tasks`, configured via `OnModelCreating` such that:
- `TaskItem.ProjectId` is a nullable foreign key to `Project.Id` with `OnDelete(DeleteBehavior.SetNull)` (deleting a project must not fail or cascade-delete its tasks — tasks just lose their project reference; this is a deliberate simplification since project deletion isn't part of this MVP's UI, but the FK behavior should still be safe if it's ever invoked directly against the DB).
- `(Column, Position)` has a non-unique index for efficient ordered queries per column.

## What to do

1. Add the `Npgsql.EntityFrameworkCore.PostgreSQL` NuGet package to `server/Kanban.Api.csproj`.
2. Create `server/Entities/Enums.cs`, `server/Entities/Project.cs`, `server/Entities/TaskItem.cs` exactly as specified above.
3. Create `server/Data/AppDbContext.cs` implementing the DbContext as specified above.
4. In `server/Program.cs`, register the DbContext: `builder.Services.AddDbContext<AppDbContext>(opt => opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")))`. This reads from the `ConnectionStrings:Default` config key, which ASP.NET Core's configuration system automatically populates from the `ConnectionStrings__Default` environment variable.
5. In `server/Program.cs`, configure controllers' JSON options to serialize enums as strings (`options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter())` on `AddControllers().AddJsonOptions(...)`).
6. In `server/Program.cs`, after building the app (`var app = builder.Build();`) and before `app.Run()`, add automatic migration on startup:
   ```csharp
   using (var scope = app.Services.CreateScope())
   {
       var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
       db.Database.Migrate();
   }
   ```
7. Add a `ConnectionStrings` section to `server/appsettings.Development.json` as a local-dev fallback (so the app runs even without the env var explicitly set in the shell), matching the pinned connection string:
   ```json
   { "ConnectionStrings": { "Default": "Host=localhost;Port=5433;Database=kanban;Username=kanban;Password=kanban_dev_password" } }
   ```
8. Install the EF Core CLI tools if not already available (`dotnet tool install --global dotnet-ef` or use `dotnet ef` if already present), and generate the initial migration: `dotnet ef migrations add InitialCreate` (run from `server/`), producing files under `server/Migrations/`.
9. Verify: with Postgres running (`docker compose up -d` from the repo root — assume the `docker-compose.yml` from the parallel task 103 exists and works), run `dotnet run` from `server/` and confirm it applies the migration on startup without errors, creating the `Projects` and `Tasks` tables in the `kanban` database.

## Acceptance criteria

- [ ] `server/Entities/Project.cs`, `server/Entities/TaskItem.cs`, `server/Entities/Enums.cs` exist matching the shapes specified above exactly (field names and types matter — later tasks depend on them).
- [ ] `server/Data/AppDbContext.cs` exists with `DbSet<Project> Projects` and `DbSet<TaskItem> Tasks`, and the FK/index configuration described above.
- [ ] `dotnet ef migrations add InitialCreate` has been run and `server/Migrations/` contains the generated migration files, checked in.
- [ ] With Postgres running via `docker compose up -d`, `dotnet run` from `server/` starts successfully and auto-applies the migration, creating the `projects` and `tasks` tables (or `Projects`/`Tasks`, per EF Core's default naming — either is fine as long as it's consistent) in the `kanban` database.
- [ ] Enums serialize as strings (e.g. `"ToDo"`, `"Medium"`) in JSON, not integers — verifiable once any endpoint returns a `TaskItem`-derived response (a later task will add the first such endpoint; for this task, it's sufficient that the `JsonStringEnumConverter` is registered in `Program.cs`).
- [ ] The app still returns 404 (not a crash) for undefined routes, and CORS/exception-handling from task 101 remain intact.

## Out of scope

- Do not create any Controllers or DTOs — those belong to tasks 301 and 302.
- Do not implement the position-reindexing logic for moving tasks between columns — that belongs to task 302 (`server/Services/TaskPositionService.cs`).
- Do not add project deletion/update logic — not part of this MVP's scope (see PRD Open Questions).
