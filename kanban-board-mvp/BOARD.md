# Kanban – Kanban Board MVP

Source PRD: [../prd-kanban-board-mvp.md](../prd-kanban-board-mvp.md)

## How to run this board with AI agents

- Tasks in the same wave are safe to run **in parallel** (one agent, session, or git worktree per task): they share no files.
- Start a wave only when every task in the previous wave is in `done/`.
- To work a task: move its file to `in-progress/`, set `status: in-progress` in its frontmatter, implement, verify acceptance criteria, then move it to `done/` and set `status: done`.
- Each task is self-contained: hand an agent just that one task file (plus repo access) — it restates all context it needs, including cross-task interface contracts.

## Execution plan

| Wave | Tasks | Max parallel agents | What it delivers |
|------|-------|---------------------|-------------------|
| 1 | 101, 102, 103 | 3 | Backend scaffold, frontend scaffold, Postgres + env + README |
| 2 | 201 | 1 | EF Core entities, DbContext, Postgres wiring, initial migration |
| 3 | 301, 302 | 2 | Projects API, Tasks API (CRUD + move) |
| 4 | 401, 402 | 2 | Frontend Projects service, frontend Tasks service |
| 5 | 501, 502 | 2 | Task editor dialog, task card component |
| 6 | 601 | 1 | Board component (integration: columns, drag-and-drop, filter, routing) |

11 tasks total, 6 waves, max 3 agents working simultaneously (wave 1).

## Shared interfaces

Pinned here for human review; each task file restates the parts it needs.

**Ports & environment**
- Backend API: `http://localhost:5080` (HTTP only, no HTTPS in dev). Routes under `/api`.
- Frontend dev server: `http://localhost:4200` (Angular CLI default).
- CORS: API allows origin `http://localhost:4200` under policy name `AllowFrontend`.
- Postgres (Docker): host port `5433` → container `5432`, db `kanban`, user `kanban`, password `kanban_dev_password`.
- API connection string env var: `ConnectionStrings__Default=Host=localhost;Port=5433;Database=kanban;Username=kanban;Password=kanban_dev_password`.
- Frontend API base URL: `environment.apiBaseUrl = 'http://localhost:5080/api'`.

**Domain model**
- `BoardColumn` enum: `ToDo | InProgress | Done` (serialized as these exact strings over JSON).
- `Priority` enum: `Low | Medium | High` (nullable; serialized as these exact strings, or `null`).
- `Project`: `{ id: number, name: string }`.
- `TaskItem` / `Task`: `{ id: number, title: string, description: string | null, projectId: number | null, priority: Priority | null, column: BoardColumn, position: number }`.
- Position: integer, 0-based, contiguous within each column; reindexed on every move.

**Backend API routes**
- `GET /api/projects` → `ProjectDto[]`
- `POST /api/projects` `{ name }` → `201` `ProjectDto`
- `GET /api/tasks?projectId={int?}` → `TaskDto[]`, ordered by column then position
- `POST /api/tasks` `{ title }` → `201` `TaskDto` (always lands in `ToDo`)
- `PUT /api/tasks/{id}` `{ title, description, projectId, priority }` → `200` `TaskDto` (never touches column/position)
- `DELETE /api/tasks/{id}` → `204`
- `PATCH /api/tasks/{id}/move` `{ column, position }` → `200` `TaskDto` (only touches column/position, reindexes affected columns)

**Frontend service contracts**
- `ProjectService`: `projects: Signal<Project[]>`, `load(): void`, `create(name): Promise<Project>`.
- `TaskService`: `tasks: Signal<Task[]>`, `load(projectId?): void`, `create(title): Promise<Task>`, `update(id, changes): Promise<Task>`, `delete(id): Promise<void>`, `move(id, column, position): Promise<Task>`.
- `TaskCardComponent` (`app-task-card`): `@Input task`, `@Input projectName`, `@Output cardClick`.
- `TaskEditorDialogComponent`: opened via `MatDialog.open(TaskEditorDialogComponent, { data: { task } })`.

**Backend project structure** (single project, `server/`): `Controllers/`, `Entities/`, `Dtos/`, `Data/` (DbContext), `Services/`. No layering beyond this.

**Frontend project structure** (`client/src/app/`): feature-based — `features/board/`, `features/tasks/`, `features/projects/`. Angular Signals for state (no NgRx, no RxJS `BehaviorSubject`).

## File ownership map

| File | Owned by task |
|------|---------------|
| `server/Kanban.Api.csproj` | 101 (created), 201 (modified) |
| `server/Program.cs` | 101 (created), 201 (modified), 302 (modified) |
| `server/appsettings.json` | 101 |
| `server/appsettings.Development.json` | 101 (created), 201 (modified) |
| `server/.gitignore` | 101 |
| `server/Entities/Project.cs` | 201 |
| `server/Entities/TaskItem.cs` | 201 |
| `server/Entities/Enums.cs` | 201 |
| `server/Data/AppDbContext.cs` | 201 |
| `server/Migrations/**` | 201 |
| `server/Dtos/ProjectDto.cs` | 301 |
| `server/Dtos/CreateProjectRequest.cs` | 301 |
| `server/Controllers/ProjectsController.cs` | 301 |
| `server/Dtos/TaskDto.cs` | 302 |
| `server/Dtos/CreateTaskRequest.cs` | 302 |
| `server/Dtos/UpdateTaskRequest.cs` | 302 |
| `server/Dtos/MoveTaskRequest.cs` | 302 |
| `server/Controllers/TasksController.cs` | 302 |
| `server/Services/TaskPositionService.cs` | 302 |
| `client/package.json`, `angular.json`, `tsconfig.json` | 102 |
| `client/src/app/app.config.ts` | 102 |
| `client/src/app/app.routes.ts` | 102 (created empty), 601 (modified) |
| `client/src/app/app.component.*` | 102 |
| `client/src/environments/*` | 102 |
| `client/src/styles.scss` | 102 |
| `client/src/app/features/projects/project.model.ts` | 401 |
| `client/src/app/features/projects/project.service.ts` | 401 |
| `client/src/app/features/tasks/task.model.ts` | 402 |
| `client/src/app/features/tasks/task.service.ts` | 402 |
| `client/src/app/features/tasks/task-editor-dialog.component.*` | 501 |
| `client/src/app/features/board/task-card.component.*` | 502 |
| `client/src/app/features/board/board.component.*` | 601 |
| `docker-compose.yml` | 103 |
| `.env.example` | 103 |
| `README.md` | 103 |

## Backlog

| ID | Wave | Task | Priority | Estimate | Depends on |
|----|------|------|----------|----------|------------|
| ~~101~~ | 1 | ~~Backend project scaffold~~ | high | M | – |
| ~~102~~ | 1 | ~~Frontend project scaffold~~ | high | M | – |
| ~~103~~ | 1 | ~~Docker Compose + env + README~~ | medium | S | – |
| ~~201~~ | 2 | ~~EF Core entities, DbContext, migration~~ | high | M | 101 |
| 301 | 3 | Projects API | high | S | 201 |
| 302 | 3 | Tasks API (CRUD + move) | high | M | 201 |
| 401 | 4 | Projects frontend service | high | S | 301 |
| 402 | 4 | Tasks frontend service | high | M | 302 |
| 501 | 5 | Task editor dialog | high | M | 401, 402 |
| 502 | 5 | Task card component | medium | S | 402 |
| 601 | 6 | Board component (integration) | high | M | 401, 402, 501, 502 |

## In progress

_(empty)_

## Done

| ID | Wave | Task |
|----|------|------|
| 101 | 1 | Backend project scaffold |
| 102 | 1 | Frontend project scaffold |
| 103 | 1 | Docker Compose + env + README |
| 201 | 2 | EF Core entities, DbContext, migration |
