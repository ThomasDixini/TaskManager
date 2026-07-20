---
id: 101
title: Backend project scaffold (ASP.NET Core Web API)
status: in-progress
wave: 1
depends_on: []
priority: high
estimate: M
files:
  - server/Kanban.Api.csproj
  - server/Program.cs
  - server/appsettings.json
  - server/appsettings.Development.json
  - server/.gitignore
prd_refs: [FR-15, NFR-Security, Technical-Considerations]
agent_ready: true
---

# 101 – Backend project scaffold (ASP.NET Core Web API)

## Context (self-contained)

We are building a personal, local-only Kanban board app (single user, no auth) with:
- Backend: ASP.NET Core Web API (single project, no layering — one project with folders for Controllers/, Entities/, Dtos/, Data/, Services/), controller-based endpoints.
- Frontend: Angular, served separately via `ng serve` on `http://localhost:4200` (built in a parallel task, not this one).
- Database: PostgreSQL, connected via EF Core (added in a later task).

This task creates the bare backend project skeleton: a buildable, runnable ASP.NET Core Web API with no business logic yet, just the cross-cutting plumbing every later backend task will build on (controllers support, CORS, global error handling). It must run standalone (`dotnet run`) without a database connection succeeding or failing anything, since no DbContext exists yet.

## Interfaces you must conform to

- The API must listen on **`http://localhost:5080`** (HTTP only, no HTTPS redirection — this is a local dev tool, HTTPS adds friction with no benefit). Configure this via `launchSettings.json` or `Program.cs` `UseUrls`.
- CORS policy name `AllowFrontend` must allow origin **`http://localhost:4200`** (the Angular dev server, from a parallel task), all methods, all headers. Apply it globally (`app.UseCors("AllowFrontend")`).
- All API routes will live under the `/api` prefix (enforced per-controller in later tasks via `[Route("api/[controller]")]` — nothing to do here, just be aware so you don't add a conflicting global route prefix).
- Add controller support (`builder.Services.AddControllers()`, `app.MapControllers()`) even though no controllers exist yet — later tasks add them and they must be auto-discovered.
- Use ASP.NET Core's built-in Problem Details support for global error handling: `builder.Services.AddProblemDetails()` and `app.UseExceptionHandler()` (net8+ built-in exception handler middleware that produces RFC 7807 `ProblemDetails` JSON for unhandled exceptions). No custom middleware class needed.

## What to do

1. Create the `server/` folder at the repo root (sibling to where the PRD lives).
2. Scaffold a new ASP.NET Core Web API project named `Kanban.Api` inside `server/` (e.g. `dotnet new webapi -n Kanban.Api -o server --use-controllers`, or equivalent), producing `server/Kanban.Api.csproj` and `server/Program.cs`. Do not use the "minimal API" template style — this app uses controllers (added by later tasks).
3. Remove any template-generated sample code that doesn't apply (e.g. the default `WeatherForecast` example endpoint/class, if the template includes one).
4. In `Program.cs`, configure, in this order: controllers support, CORS policy `AllowFrontend` (origin `http://localhost:4200`), Problem Details / exception handler, then `app.UseCors("AllowFrontend")` and `app.MapControllers()` in the middleware pipeline.
5. Configure the app to listen on `http://localhost:5080` for all environments used in local dev.
6. Set up `appsettings.json` (empty/defaults) and `appsettings.Development.json` (placeholder — a later task will add a `ConnectionStrings` section here, you don't need to add it now, but leave the file present and valid empty JSON `{}`).
7. Add a `server/.gitignore` covering standard .NET build artifacts (`bin/`, `obj/`).
8. Verify the project builds and runs: `dotnet build` succeeds, `dotnet run` starts the app listening on port 5080 without errors.

## Acceptance criteria

- [ ] `dotnet build` succeeds from inside `server/` with no errors.
- [ ] `dotnet run` starts the API and it listens on `http://localhost:5080`.
- [ ] The API returns a 404 (not a crash) when hitting an undefined route like `http://localhost:5080/api/anything`, proving the middleware pipeline (controllers + routing) is wired up correctly.
- [ ] `Program.cs` registers a CORS policy named `AllowFrontend` allowing `http://localhost:4200`.
- [ ] `Program.cs` calls `AddProblemDetails()` and `UseExceptionHandler()` (or equivalent net8+ built-in exception-to-ProblemDetails pipeline).
- [ ] No `WeatherForecast` or other template sample code remains.

## Out of scope

- Do not add EF Core, a DbContext, or any NuGet packages related to PostgreSQL — that belongs to task 201.
- Do not create any Controllers, Entities, Dtos, or Services files/folders — those are created by later tasks that own those files.
- Do not add Swagger/OpenAPI unless the template includes it by default; if it does, leave it as-is but don't invest extra effort configuring it (not required by the PRD).
- Do not touch anything under `client/` (owned by task 102) or the root `docker-compose.yml` (owned by task 103).
